import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { isPrimaryAdmin } from "@/lib/auth/admin";
import { createAuditLog } from "@/lib/mailboxes/audit";
import {
	ACCOUNTS_COOKIE,
	cookieOptions,
	isSameOrigin,
	parseAccountTokens,
	resolveAccounts,
	serializeAccountTokens,
} from "@/lib/auth/accounts";
import { createSession, getSessionTokenFromRequestHeaders, getUserFromSession, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Make another account the active one. Two ways in:
 * - An account already signed in on this browser (its token is in the httpOnly accounts cookie) is switched to
 *   directly, re-validated here.
 * - Otherwise the primary administrator may open any enabled account without its password (impersonation): a fresh
 *   session is minted and the switch is written to the audit log (`auth.impersonate`).
 * The token is returned because the web client mirrors the active session in its bearer header, as after a login.
 */
export async function POST(request: Request) {
	if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	const env = getEnv();
	const body = (await request.json().catch(() => null)) as { userId?: unknown } | null;
	const userId = typeof body?.userId === "string" ? body.userId : "";
	const jar = await cookies();
	const accounts = await resolveAccounts(env, parseAccountTokens(jar.get(ACCOUNTS_COOKIE)?.value));

	let token = accounts.find((account) => account.userId === userId)?.token ?? null;
	let tokens = accounts.map((account) => account.token);

	if (!token) {
		// Not signed in on this browser: only the primary admin may open it, by impersonation.
		const caller = await getUserFromSession(env, getSessionTokenFromRequestHeaders(request));
		if (!caller || !isPrimaryAdmin(caller) || caller.id === userId) {
			return NextResponse.json({ error: "Sign in again to use this account" }, { status: 401 });
		}
		const [target] = await getDb(env)
			.select({ id: users.id, disabled: users.disabled, deletedAt: users.deletedAt })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		if (!target || target.disabled || target.deletedAt) {
			return NextResponse.json({ error: "Account not found" }, { status: 404 });
		}
		token = await createSession(env, target.id);
		tokens = [...tokens, token];
		await createAuditLog(env, { actorUserId: caller.id, targetUserId: target.id, action: "auth.impersonate" });
	}

	const response = NextResponse.json({ ok: true, token, redirect: "/inbox" });
	response.headers.set("Cache-Control", "no-store");
	response.cookies.set(SESSION_COOKIE, token, cookieOptions());
	// Prune dead entries, keep the one just activated.
	response.cookies.set(ACCOUNTS_COOKIE, serializeAccountTokens(tokens), cookieOptions());
	return response;
}
