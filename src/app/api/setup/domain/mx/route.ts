import { NextResponse } from "next/server";
import { hasAdminAccount } from "@/lib/auth/setup";
import { getEnv } from "@/lib/cloudflare";
import { preflightDomain } from "@/lib/domains/preflight";
import { hasConflictingMxRecords } from "@/lib/domains/mx-records";
import { isManualZone } from "@/lib/domains/provision";
import { setupDomainSchema } from "@/lib/validators";
import { readJsonBody } from "@/lib/http/request";
import { validationError } from "@/lib/api/responses";
import { RequestBodyTooLargeError } from "@/lib/http/errors";

export async function POST(request: Request) {
	const env = getEnv();
	if (await hasAdminAccount(env)) {
		return NextResponse.json({ error: "Initial setup is already complete" }, { status: 403 });
	}

	let body: unknown;
	try {
		body = await readJsonBody(request, 16 * 1024);
	} catch (error) {
		const status = error instanceof RequestBodyTooLargeError ? 413 : 400;
		return NextResponse.json({ error: "Invalid MX check request" }, { status });
	}

	const parsed = setupDomainSchema.safeParse(body);
	if (!parsed.success) return validationError(parsed.error);

	try {
		const domain = await preflightDomain(env, parsed.data.hostname);
		// A manual zone's MX is set by hand, so there is nothing here to replace.
		const hasExistingMx = !isManualZone(domain.zone.id) && await hasConflictingMxRecords(
			env,
			domain.zone.id,
			domain.hostname,
		);
		return NextResponse.json({ hasExistingMx });
	} catch (error) {
		const message = error instanceof Error ? error.message : "MX record check failed";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
