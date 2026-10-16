import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, isNull, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getEnv } from "@/lib/cloudflare";
import { isPrimaryAdmin } from "@/lib/auth/admin";
import { ACCOUNTS_COOKIE, parseAccountTokens, resolveAccounts } from "@/lib/auth/accounts";
import { getSessionTokenFromRequestHeaders, getUserFromSession } from "@/lib/auth/session";

/**
 * Accounts signed in on this browser, plus — for the primary administrator — the accounts they manage, which can be
 * opened without a password (impersonation, see /api/auth/switch). Tokens are never returned.
 */
export async function GET(request: Request) {
	const env = getEnv();
	const jar = await cookies();
	const activeToken = getSessionTokenFromRequestHeaders(request);
	// Include the current session so accounts signed in before this cookie existed still list.
	const signedIn = await resolveAccounts(
		env,
		Array.from(new Set(parseAccountTokens(jar.get(ACCOUNTS_COOKIE)?.value).concat(activeToken ?? []))),
	);
	const accounts = signedIn.map(({ token, avatarKey: _avatarKey, ...account }) => ({
		...account,
		active: token === activeToken,
		managed: false,
	}));

	const activeUser = await getUserFromSession(env, activeToken);
	if (activeUser && isPrimaryAdmin(activeUser)) {
		const known = new Set(accounts.map((account) => account.userId));
		const managed = await getDb(env)
			.select({ userId: users.id, email: users.email, name: users.name, avatarKey: users.avatarKey })
			.from(users)
			.where(and(eq(users.createdByUserId, activeUser.id), eq(users.disabled, false), isNull(users.deletedAt), ne(users.id, activeUser.id)));
		for (const row of managed) {
			if (known.has(row.userId)) continue;
			accounts.push({ userId: row.userId, email: row.email, name: row.name, hasAvatar: !!row.avatarKey, active: false, managed: true });
		}
	}

	const response = NextResponse.json({ accounts });
	response.headers.set("Cache-Control", "no-store");
	return response;
}
