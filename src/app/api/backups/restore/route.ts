import { NextResponse } from "next/server";
import { isPrimaryAdmin } from "@/lib/auth/admin";
import { requireSessionUser } from "@/lib/api/auth";
import { restoreDatabaseRecords } from "@/lib/backups/export";
import { getEnv } from "@/lib/cloudflare";

export async function POST(request: Request) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	if (!isPrimaryAdmin(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	try {
		const form = await request.formData();
		const file = form.get("backup");
		if (!(file instanceof File)) return NextResponse.json({ error: "Choose a backup file" }, { status: 400 });
		await restoreDatabaseRecords(env.DB, await file.arrayBuffer());
		return NextResponse.json({ ok: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to restore backup";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
