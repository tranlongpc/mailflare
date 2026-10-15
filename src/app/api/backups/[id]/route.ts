import { NextResponse } from "next/server";
import { assertPrimaryAdmin } from "@/lib/auth/admin";
import { requireSessionUser } from "@/lib/api/auth";
import { deleteBackup } from "@/lib/backups/service";
import { getEnv } from "@/lib/cloudflare";

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	try {
		assertPrimaryAdmin(session.user);
		const { id } = await params;
		const deleted = await deleteBackup(env, id);
		if (!deleted) return NextResponse.json({ error: "Backup not found" }, { status: 404 });
		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
}
