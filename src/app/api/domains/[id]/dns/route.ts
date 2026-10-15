import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare";
import { requireSessionUser } from "@/lib/api/auth";
import { getDomainForUser } from "@/lib/domains/service";
import { getDomainDnsView } from "@/lib/domains/dns-view";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
	const { id } = await params;
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;
	const domain = await getDomainForUser(env, user.id, id);
	if (!domain) return NextResponse.json({ error: "Not found" }, { status: 404 });

	try {
		const dns = await getDomainDnsView(env, domain);
		return NextResponse.json({
			domain: { ...domain, sendingEnabled: dns.sendingEnabled },
			dns,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to fetch DNS";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
