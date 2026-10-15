import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { folders } from "@/db/schema";
import { requireSessionUser } from "@/lib/api/auth";
import { readJson, validationError } from "@/lib/api/responses";
import { getEnv } from "@/lib/cloudflare";
import { newId } from "@/lib/ids";
import { folderSchema } from "@/lib/validators";
import { getMailboxFolderAccess, listFoldersForMailbox } from "./utils";

export async function GET(request: Request) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;
	const url = new URL(request.url);
	const mailboxId = url.searchParams.get("mailboxId");
	if (!mailboxId) {
		return NextResponse.json({ folders: [] });
	}

	const db = getDb(env);
	const access = await getMailboxFolderAccess(db, user, mailboxId);
	if (!access) {
		return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
	}

	const rows = await listFoldersForMailbox(db, mailboxId);
	return NextResponse.json({ folders: rows });
}

export async function POST(request: Request) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;
	const body = await readJson<unknown>(request);
	if (body.error) return body.error;
	const parsed = folderSchema.safeParse(body.data);
	if (!parsed.success) return validationError(parsed.error);

	const db = getDb(env);
	const access = await getMailboxFolderAccess(db, user, parsed.data.mailboxId);
	if (!access?.canManage) {
		return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
	}

	const name = parsed.data.name.trim();
	const [existing] = await db
		.select()
		.from(folders)
		.where(and(eq(folders.mailboxId, parsed.data.mailboxId), eq(folders.name, name)))
		.limit(1);
	if (existing) {
		return NextResponse.json({ error: "Folder already exists" }, { status: 409 });
	}

	const id = newId("fld");
	await db.insert(folders).values({
		id,
		userId: access.mailboxUserId,
		mailboxId: parsed.data.mailboxId,
		name,
		color: parsed.data.color,
	});

	return NextResponse.json({ id, mailboxId: parsed.data.mailboxId, name, color: parsed.data.color });
}
