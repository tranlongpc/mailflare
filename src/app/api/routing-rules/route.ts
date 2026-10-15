import { NextResponse } from "next/server";
import { readJson, validationError } from "@/lib/api/responses";
import { and, eq } from "drizzle-orm";
import { getEnv } from "@/lib/cloudflare";
import { getDb } from "@/db";
import { folders, routingRules } from "@/db/schema";
import { requireSessionUser } from "@/lib/api/auth";
import { newId } from "@/lib/ids";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";
import { routingRuleSchema } from "@/lib/validators";

export async function GET(request: Request) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;
	const url = new URL(request.url);
	const mailboxId = url.searchParams.get("mailboxId");
	if (!mailboxId) {
		return NextResponse.json({ rules: [] });
	}

	const db = getDb(env);
	const access = await getMailboxAccessLevel(db, user, mailboxId);
	if (!access?.canManage) {
		return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
	}

	const rows = await db
		.select()
		.from(routingRules)
		.where(and(eq(routingRules.mailboxId, mailboxId), eq(routingRules.scope, "mailbox")));
	return NextResponse.json({ rules: rows });
}

export async function POST(request: Request) {
	const env = getEnv();
	const session = await requireSessionUser(env, request);
	if (session.error) return session.error;
	const user = session.user;
	const body = await readJson<unknown>(request);
	if (body.error) return body.error;
	const parsed = routingRuleSchema.safeParse(body.data);
	if (!parsed.success) return validationError(parsed.error);

	const db = getDb(env);
	const access = await getMailboxAccessLevel(db, user, parsed.data.mailboxId);
	if (!access?.canManage) {
		return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
	}
	const mailbox = access.mailbox;

	const destination = parsed.data.destination ?? (parsed.data.folderId ? `folder:${parsed.data.folderId}` : "");
	const systemAction = destination === "spam" || destination === "trash" ? destination : null;
	const folderId = destination.startsWith("folder:") ? destination.slice("folder:".length) : null;

	if (!systemAction && !folderId) {
		return NextResponse.json({ error: "Destination is required" }, { status: 400 });
	}

	if (folderId) {
		const [folder] = await db
			.select()
			.from(folders)
			.where(and(eq(folders.id, folderId), eq(folders.mailboxId, mailbox.id)))
			.limit(1);
		if (!folder) {
			return NextResponse.json({ error: "Folder not found" }, { status: 404 });
		}
	}

	const id = newId("rule");
	await db.insert(routingRules).values({
		id,
		userId: user.id,
		domainId: mailbox.domainId,
		scope: "mailbox",
		pattern: parsed.data.matchValue.trim(),
		matchField: parsed.data.matchField,
		matchOperator: parsed.data.matchOperator,
		matchValue: parsed.data.matchValue.trim(),
		action: systemAction ?? "store",
		mailboxId: mailbox.id,
		folderId,
		forwardTo: null,
		priority: parsed.data.priority,
	});

	return NextResponse.json({ id, ...parsed.data });
}
