import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { backups } from "@/db/schema";
import { assertPrimaryAdmin } from "@/lib/auth/admin";
import { requireSessionUser } from "@/lib/api/auth";
import { getEnv } from "@/lib/cloudflare";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	try {
		assertPrimaryAdmin(session.user);
		const { id } = await params;
		const [backup] = await getDb(env).select().from(backups).where(eq(backups.id, id)).limit(1);
		if (!backup?.r2Key) return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
		const object = await env.BUCKET.get(backup.r2Key);
		if (!object) return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
		return new Response(object.body, {
			headers: {
				"Content-Type": "application/sql",
				"Content-Disposition": `attachment; filename="${backup.filename ?? `${backup.id}.sql`}"`,
				"Content-Length": String(object.size),
			},
		});
	} catch {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
}
