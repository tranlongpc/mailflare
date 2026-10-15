import { NextResponse } from "next/server";
import { isPrimaryAdmin } from "@/lib/auth/admin";
import { readJson } from "@/lib/api/responses";
import { requireSessionUser } from "@/lib/api/auth";
import { getBackupConfigurationStatus } from "@/lib/backups/export";
import { runDatabaseBackup } from "@/lib/backups/runner";
import {
	createBackupRecord,
	getBackupSettings,
	listBackups,
	updateBackupSettings,
} from "@/lib/backups/service";
import { getEnv } from "@/lib/cloudflare";
import { parseBackupSettingsInput } from "./utils";

async function requireAdmin(request: Request) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return { env, user: null, error: session.error };
	if (!isPrimaryAdmin(session.user)) return { env, user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
	return { env, user: session.user, error: null };
}

export async function GET(request: Request) {
	const access = await requireAdmin(request);
	if (access.error) return access.error;
	const { env } = access;
	try {
		const [settings, backupList] = await Promise.all([
			getBackupSettings(env),
			listBackups(env),
		]);
		return NextResponse.json({
			settings,
			backups: backupList,
			configuration: getBackupConfigurationStatus(env),
		});
	} catch {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
}

export async function PUT(request: Request) {
	const access = await requireAdmin(request);
	if (access.error) return access.error;
	const { env } = access;
	const body = await readJson<unknown>(request);
	if (body.error) return body.error;
	try {
		const input = parseBackupSettingsInput(body.data);
		if (!input) return NextResponse.json({ error: "Invalid backup settings" }, { status: 400 });
		await updateBackupSettings(env, input);
		return NextResponse.json({ ok: true });
	} catch {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}
}

export async function POST(request: Request) {
	const access = await requireAdmin(request);
	if (access.error) return access.error;
	const { env, user } = access;
	try {
		const backupId = await createBackupRecord(env, "manual", user.id);
		await runDatabaseBackup(env, backupId);
		return NextResponse.json({ backupId });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to run backup";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
