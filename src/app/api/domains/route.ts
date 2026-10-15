import { NextRequest, NextResponse } from "next/server";
import { readJson, validationError } from "@/lib/api/responses";
import { getEnv } from "@/lib/cloudflare";
import { requireSessionUser } from "@/lib/api/auth";
import { canManageDomains } from "@/lib/auth/admin";
import { addDomainSchema } from "@/lib/validators";
import { addDomainForUser, listUserDomains } from "@/lib/domains/service";
import type { DnsStatusSummary } from "@/lib/dns-status";
import { summariseDomainDns } from "@/lib/domains/dns-view";
import { getDomainProvisioningError } from "@/lib/domains/errors";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";

export async function GET(request: NextRequest) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;
	const domainOwnerId = user.canManageMailboxes && user.createdByUserId ? user.createdByUserId : user.id;
	const domains = await listUserDomains(env, domainOwnerId);

	const includeDns = request.nextUrl.searchParams.get("includeDns") === "true";

	const dns: Record<string, DnsStatusSummary> = {};
	let domainViews = domains;
	if (includeDns) {
		const results = await Promise.allSettled(
			domains.map(async (domain) => {
				const { summary, sendingEnabled } = await summariseDomainDns(env, domain);
				return { id: domain.id, summary, sendingEnabled };
			}),
		);
		const sendingEnabledByDomain = new Map<string, boolean>();
		for (const r of results) {
			if (r.status === "fulfilled") {
				dns[r.value.id] = r.value.summary;
				sendingEnabledByDomain.set(r.value.id, r.value.sendingEnabled);
			}
		}
		domainViews = domains.map((domain) => ({
			...domain,
			sendingEnabled: sendingEnabledByDomain.get(domain.id) ?? domain.sendingEnabled,
		}));
	}

	return NextResponse.json({ domains: domainViews, dns: includeDns ? dns : undefined });
}

export async function POST(request: Request) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;
	if (!canManageDomains(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	if (!hasValidSessionMutationOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
	const body = await readJson<unknown>(request);
	if (body.error) return body.error;
	const parsed = addDomainSchema.safeParse(body.data);
	if (!parsed.success) return validationError(parsed.error);

	try {
		const result = await addDomainForUser(env, user.id, parsed.data.hostname, {
			enableRouting: parsed.data.enableRouting,
			enableSending: parsed.data.enableSending,
			replaceMxRecords: parsed.data.replaceMxRecords,
			receivingProvider: parsed.data.receivingProvider,
			sendingProvider: parsed.data.sendingProvider,
		});
		return NextResponse.json(result);
	} catch (err) {
		const failure = getDomainProvisioningError(err, "Failed to add domain");
		return NextResponse.json(
			{ error: failure.message, code: failure.code },
			{ status: failure.status },
		);
	}
}
