import { NextResponse } from "next/server";
import { readJson, validationError } from "@/lib/api/responses";
import { requireSessionUser } from "@/lib/api/auth";
import { getEnv } from "@/lib/cloudflare";
import { preflightDomain } from "@/lib/domains/preflight";
import { setupDomainSchema } from "@/lib/validators";

export async function POST(request: Request) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const body = await readJson<unknown>(request);
	if (body.error) return body.error;
	const parsed = setupDomainSchema.safeParse(body.data);
	if (!parsed.success) return validationError(parsed.error);

	try {
		return NextResponse.json({ domain: await preflightDomain(env, parsed.data.hostname) });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Domain check failed";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
