import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { getEnv } from "@/lib/cloudflare";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireSessionUser } from "@/lib/api/auth";
import { validationError } from "@/lib/api/responses";
import { getLicenseEntitlements } from "@/lib/licenses/service";
import { syncPersonalIdentity } from "@/lib/profile/sync";
import type { UpdateProfileInput } from "./types";
import { parseUpdateProfileRequest } from "./utils";

export async function PATCH(request: Request) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;
	let parsed: UpdateProfileInput;
	try {
		parsed = await parseUpdateProfileRequest(request);
	} catch (err) {
		if (err instanceof ZodError) return validationError(err);
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	const db = getDb(env);
	const canForwardEmail = (await getLicenseEntitlements(env)).canForwardEmail;
	if (!canForwardEmail && parsed.forwardingEmail && parsed.forwardingEmail !== user.forwardingEmail) {
		return NextResponse.json({ error: "A Pro or Team license is required for email forwarding" }, { status: 403 });
	}
	const forwardingEmail = parsed.forwardingEmail === undefined ? user.forwardingEmail : parsed.forwardingEmail;
	await syncPersonalIdentity(db, {
		userId: user.id,
		name: parsed.name,
		avatarKey: user.avatarKey,
	});
	await db
		.update(users)
		.set({ resetEmail: parsed.resetEmail, forwardingEmail })
		.where(eq(users.id, user.id));

	return NextResponse.json({
		user: {
			id: user.id,
			email: user.email,
			name: parsed.name,
			resetEmail: parsed.resetEmail,
			forwardingEmail,
			canForwardEmail,
		},
	});
}
