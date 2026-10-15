import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { driveItems, driveUploadParts } from "@/db/schema";
import { authorizeDrive } from "@/lib/drive/auth";
import { getDriveItem, getDriveRole, toDriveItemDtos } from "@/lib/drive/access";
import { canEditDrive, DRIVE_MAX_PARTS, driveObjectKey } from "@/lib/drive/utils";
import { getDirectStorage, listUploadedParts, presignUploadPart } from "@/lib/storage/direct";
import type { DriveItemParams } from "../../items/[id]/types";

async function loadPending(request: Request, params: DriveItemParams["params"]) {
	const { id } = await params;
	const auth = await authorizeDrive(request, true);
	if (auth.error) return { error: auth.error } as const;
	const item = await getDriveItem(auth.db, id);
	const role = item ? await getDriveRole(auth.db, auth.user.id, item) : null;
	if (!item || !item.uploadId || !canEditDrive(role)) return { error: NextResponse.json({ error: "Upload not found" }, { status: 404 }) } as const;
	const key = item.r2Key ?? driveObjectKey(item.ownerId, item.id);
	const upload = auth.env.BUCKET.resumeMultipartUpload(key, item.uploadId);
	return { ...auth, item, key, uploadId: item.uploadId, upload, role: role! } as const;
}

/** Every part but the last is `uploadPartSize` bytes; R2 requires it, and the sizes must add up to the declared file. */
function expectedPartSize(item: { size: number; uploadPartSize: number | null }, partNumber: number): number | null {
	const partSize = item.uploadPartSize ?? 0;
	const total = partSize ? Math.ceil(item.size / partSize) : 0;
	if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > Math.min(total, DRIVE_MAX_PARTS)) return null;
	return partNumber < total ? partSize : item.size - (total - 1) * partSize;
}

/** A signed URL for sending one part straight to the bucket. 404 when the bucket cannot take uploads from the browser. */
export async function GET(request: Request, { params }: DriveItemParams) {
	const ctx = await loadPending(request, params);
	if (ctx.error) return ctx.error;
	const direct = await getDirectStorage(ctx.env);
	if (!direct) return NextResponse.json({ error: "Direct upload is not available" }, { status: 404 });
	const partNumber = Number(new URL(request.url).searchParams.get("part"));
	if (expectedPartSize(ctx.item, partNumber) === null) return NextResponse.json({ error: "Invalid part number" }, { status: 400 });
	await ctx.db.update(driveItems).set({ updatedAt: new Date() }).where(eq(driveItems.id, ctx.item.id));
	return NextResponse.json({ url: await presignUploadPart(direct, ctx.key, ctx.uploadId, partNumber) });
}

/** Uploads one part. The body is the raw bytes of the part. */
export async function PUT(request: Request, { params }: DriveItemParams) {
	const ctx = await loadPending(request, params);
	if (ctx.error) return ctx.error;
	const partNumber = Number(new URL(request.url).searchParams.get("part"));
	const length = Number(request.headers.get("content-length"));
	const expected = expectedPartSize(ctx.item, partNumber);
	if (expected === null) return NextResponse.json({ error: "Invalid part number" }, { status: 400 });
	if (!request.body || length !== expected) return NextResponse.json({ error: "Invalid part size" }, { status: 400 });
	const part = await ctx.upload.uploadPart(partNumber, request.body);
	await ctx.db.insert(driveUploadParts).values({ itemId: ctx.item.id, partNumber, etag: part.etag }).onConflictDoUpdate({ target: [driveUploadParts.itemId, driveUploadParts.partNumber], set: { etag: part.etag } });
	await ctx.db.update(driveItems).set({ updatedAt: new Date() }).where(eq(driveItems.id, ctx.item.id));
	return NextResponse.json({ partNumber, etag: part.etag });
}

/** Finishes the upload from the recorded parts and makes the file visible. */
export async function POST(request: Request, { params }: DriveItemParams) {
	const ctx = await loadPending(request, params);
	if (ctx.error) return ctx.error;
	const recorded = await ctx.db.select({ partNumber: driveUploadParts.partNumber, etag: driveUploadParts.etag }).from(driveUploadParts).where(eq(driveUploadParts.itemId, ctx.item.id));
	const parts = new Map(recorded.map((part) => [part.partNumber, part.etag]));
	// Parts the browser sent straight to the bucket were never seen here, so their sizes are checked now.
	// A listing failure only matters if parts are missing: an upload sent entirely through the app is complete without it.
	const direct = await getDirectStorage(ctx.env);
	let unlisted = false;
	if (direct) {
		const listed = await listUploadedParts(direct, ctx.key, ctx.uploadId).catch(() => null);
		unlisted = !listed;
		for (const part of listed ?? []) {
			if (part.size !== expectedPartSize(ctx.item, part.partNumber)) return NextResponse.json({ error: `Part ${part.partNumber} has the wrong size` }, { status: 409 });
			parts.set(part.partNumber, part.etag);
		}
	}
	const total = ctx.item.uploadPartSize ? Math.ceil(ctx.item.size / ctx.item.uploadPartSize) : 0;
	if (!total || parts.size !== total) return NextResponse.json({ error: unlisted ? "Could not read the uploaded parts from storage" : "Some parts are missing" }, { status: unlisted ? 502 : 409 });
	let object;
	try { object = await ctx.upload.complete([...parts].map(([partNumber, etag]) => ({ partNumber, etag }))); }
	catch { return NextResponse.json({ error: "Could not complete the upload" }, { status: 400 }); }
	const row = { ...ctx.item, size: object.size, uploadId: null, uploadPartSize: null, uploadFingerprint: null, updatedAt: new Date() };
	await ctx.db.update(driveItems).set({ size: row.size, uploadId: null, uploadPartSize: null, uploadFingerprint: null, updatedAt: row.updatedAt }).where(eq(driveItems.id, ctx.item.id));
	await ctx.db.delete(driveUploadParts).where(eq(driveUploadParts.itemId, ctx.item.id));
	const [item] = await toDriveItemDtos(ctx.db, [row], ctx.user.id, () => ctx.role);
	return NextResponse.json({ item });
}

/** Abandons an upload and discards what was sent. */
export async function DELETE(request: Request, { params }: DriveItemParams) {
	const ctx = await loadPending(request, params);
	if (ctx.error) return ctx.error;
	await ctx.upload.abort().catch(() => undefined);
	await ctx.db.delete(driveUploadParts).where(eq(driveUploadParts.itemId, ctx.item.id));
	await ctx.db.delete(driveItems).where(eq(driveItems.id, ctx.item.id));
	return NextResponse.json({ ok: true });
}
