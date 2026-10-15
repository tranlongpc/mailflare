import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { mailboxes, mailboxSupervisors, users } from "@/db/schema";
import { requireSessionUser } from "@/lib/api/auth";
import { isPrimaryAdmin } from "@/lib/auth/admin";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { getEnv } from "@/lib/cloudflare";
import { newId } from "@/lib/ids";
import { createAuditLog } from "@/lib/mailboxes/audit";

/**
 * Supervision of an account's mailboxes (read-only access for another account). Primary admin only. Granting and
 * revoking are audit-logged, as is every message a supervisor opens (`email.supervisor_view`).
 */

const bodySchema = z.object({ mailboxId: z.string().min(1), userId: z.string().min(1) });
const noStore = { "Cache-Control": "no-store" };

async function authorize(request: Request, mutation: boolean) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return { env, user: null, error: auth.error };
	if (!isPrimaryAdmin(auth.user)) return { env, user: null, error: Response.json({ error: "Only the primary administrator can manage supervision" }, { status: 403 }) };
	if (mutation && !hasValidSessionMutationOrigin(request)) return { env, user: null, error: Response.json({ error: "Invalid origin" }, { status: 403 }) };
	return { env, user: auth.user, error: null };
}

/** `?accountId=` → who supervises each of that account's mailboxes, and who could. */
export async function GET(request: Request) {
	const access = await authorize(request, false);
	if (access.error) return access.error;
	const accountId = new URL(request.url).searchParams.get("accountId");
	if (!accountId) return Response.json({ error: "accountId is required" }, { status: 400 });
	const db = getDb(access.env);
	const owned = await db.select({ id: mailboxes.id }).from(mailboxes).where(eq(mailboxes.userId, accountId));
	const mailboxIds = owned.map((row) => row.id);
	const [supervisors, candidates] = await Promise.all([
		mailboxIds.length
			? db.select({ mailboxId: mailboxSupervisors.mailboxId, userId: users.id, name: users.name, email: users.email })
				.from(mailboxSupervisors)
				.innerJoin(users, eq(mailboxSupervisors.supervisorUserId, users.id))
				.where(inArray(mailboxSupervisors.mailboxId, mailboxIds))
			: [],
		db.select({ id: users.id, name: users.name, email: users.email })
			.from(users)
			.where(and(ne(users.id, accountId), eq(users.disabled, false))),
	]);
	return Response.json({ supervisors, candidates }, { headers: noStore });
}

export async function POST(request: Request) {
	const access = await authorize(request, true);
	if (access.error) return access.error;
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return Response.json({ error: "Choose a mailbox and an account" }, { status: 400 });
	const { mailboxId, userId } = parsed.data;
	const db = getDb(access.env);
	const [mailbox] = await db.select({ userId: mailboxes.userId }).from(mailboxes).where(eq(mailboxes.id, mailboxId)).limit(1);
	if (!mailbox) return Response.json({ error: "Mailbox not found" }, { status: 404 });
	if (mailbox.userId === userId) return Response.json({ error: "The owner already sees this mailbox" }, { status: 400 });
	const [supervisor] = await db.select({ disabled: users.disabled }).from(users).where(eq(users.id, userId)).limit(1);
	if (!supervisor || supervisor.disabled) return Response.json({ error: "Account not found" }, { status: 404 });
	await db.insert(mailboxSupervisors)
		.values({ id: newId("msv"), mailboxId, supervisorUserId: userId, createdByUserId: access.user!.id })
		.onConflictDoNothing();
	await createAuditLog(access.env, { actorUserId: access.user!.id, targetUserId: userId, mailboxId, action: "mailbox.supervisor_grant" });
	return Response.json({ ok: true }, { headers: noStore });
}

export async function DELETE(request: Request) {
	const access = await authorize(request, true);
	if (access.error) return access.error;
	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return Response.json({ error: "Choose a mailbox and an account" }, { status: 400 });
	const { mailboxId, userId } = parsed.data;
	await getDb(access.env).delete(mailboxSupervisors)
		.where(and(eq(mailboxSupervisors.mailboxId, mailboxId), eq(mailboxSupervisors.supervisorUserId, userId)));
	await createAuditLog(access.env, { actorUserId: access.user!.id, targetUserId: userId, mailboxId, action: "mailbox.supervisor_revoke" });
	return Response.json({ ok: true }, { headers: noStore });
}
