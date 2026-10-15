import { and, eq } from "drizzle-orm";
import type { AppDatabase } from "@/db";
import { domains, mailboxAccess, mailboxes, mailboxSupervisors } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/types";
import { isTeamMailboxSharingEnabled } from "./access-utils";
import type { MailboxAccessLevel, MailboxPermission } from "./types";

const permissionRank: Record<MailboxPermission, number> = {
	read_only: 1,
	send_on_behalf: 2,
	send_as: 3,
	full_access: 4,
};

export function hasMailboxPermission(permission: MailboxPermission, required: MailboxPermission): boolean {
	return permissionRank[permission] >= permissionRank[required];
}

export async function getMailboxAccessLevel(
	db: AppDatabase,
	user: Pick<SessionUser, "id" | "role">,
	mailboxId: string,
): Promise<MailboxAccessLevel | null> {
	const [mailbox] = await db.select().from(mailboxes).where(eq(mailboxes.id, mailboxId)).limit(1);
	if (!mailbox || mailbox.disabled) return null;

	const isOwner = mailbox.userId === user.id;
	if (isOwner) return buildAccess(mailbox, "full_access", true);
	if (mailbox.type === "shared" && (await isTeamMailboxSharingEnabled(db))) {
		const [delegatedAccess] = await db
			.select({ permission: mailboxAccess.permission })
			.from(mailboxAccess)
			.where(and(eq(mailboxAccess.mailboxId, mailbox.id), eq(mailboxAccess.userId, user.id)))
			.limit(1);
		if (delegatedAccess) return buildAccess(mailbox, delegatedAccess.permission, false);
	}

	if (await isMailboxSupervisor(db, mailbox.id, user.id)) return buildAccess(mailbox, "read_only", false, true);
	return null;
}

export async function isMailboxSupervisor(db: AppDatabase, mailboxId: string, userId: string): Promise<boolean> {
	const [row] = await db
		.select({ id: mailboxSupervisors.id })
		.from(mailboxSupervisors)
		.where(and(eq(mailboxSupervisors.mailboxId, mailboxId), eq(mailboxSupervisors.supervisorUserId, userId)))
		.limit(1);
	return !!row;
}

export async function listAccessibleMailboxes(db: AppDatabase, user: Pick<SessionUser, "id" | "email" | "role">) {
	const ownedRows = await db
		.select({
			id: mailboxes.id,
			userId: mailboxes.userId,
			domainId: mailboxes.domainId,
		localPart: mailboxes.localPart,
		displayName: mailboxes.displayName,
		signature: mailboxes.signature,
		autoReplyEnabled: mailboxes.autoReplyEnabled,
		autoReplySubject: mailboxes.autoReplySubject,
		autoReplyBody: mailboxes.autoReplyBody,
		useAllDomains: mailboxes.useAllDomains,
			avatarKey: mailboxes.avatarKey,
			type: mailboxes.type,
			disabled: mailboxes.disabled,
			createdAt: mailboxes.createdAt,
			hostname: domains.hostname,
		})
		.from(mailboxes)
		.innerJoin(domains, eq(mailboxes.domainId, domains.id))
		.where(and(eq(mailboxes.userId, user.id), eq(mailboxes.disabled, false)));
	const owned = ownedRows
		.map((row) => {
			const { avatarKey, ...mailbox } = row;
			return {
				...mailbox,
				hasAvatar: !!avatarKey,
				permission: "full_access" as MailboxPermission,
				isPrimary: `${row.localPart}@${row.hostname}` === user.email,
				supervised: false,
			};
		});

	const supervised = await listSupervisedMailboxes(db, user.id);
	if (!(await isTeamMailboxSharingEnabled(db))) return withSupervised([...owned], supervised);
	const sharedRows = await db
		.select({
			id: mailboxes.id,
			userId: mailboxes.userId,
			domainId: mailboxes.domainId,
		localPart: mailboxes.localPart,
		displayName: mailboxes.displayName,
		signature: mailboxes.signature,
		autoReplyEnabled: mailboxes.autoReplyEnabled,
		autoReplySubject: mailboxes.autoReplySubject,
		autoReplyBody: mailboxes.autoReplyBody,
		useAllDomains: mailboxes.useAllDomains,
			avatarKey: mailboxes.avatarKey,
			type: mailboxes.type,
			disabled: mailboxes.disabled,
			createdAt: mailboxes.createdAt,
			hostname: domains.hostname,
			permission: mailboxAccess.permission,
		})
		.from(mailboxAccess)
		.innerJoin(mailboxes, eq(mailboxAccess.mailboxId, mailboxes.id))
		.innerJoin(domains, eq(mailboxes.domainId, domains.id))
		.where(
			and(
				eq(mailboxAccess.userId, user.id),
				eq(mailboxes.type, "shared"),
				eq(mailboxes.disabled, false),
			),
		);
	const shared = sharedRows.map((row) => {
		const { avatarKey, ...mailbox } = row;
		return {
			...mailbox,
			hasAvatar: !!avatarKey,
			isPrimary: false,
			supervised: false,
		};
	});

	return withSupervised([...owned, ...shared], supervised);
}

type AccessibleMailbox = Awaited<ReturnType<typeof listSupervisedMailboxes>>[number];

/** Supervised mailboxes the user does not already reach as owner or member. */
function withSupervised<T extends { id: string }>(rows: T[], supervised: AccessibleMailbox[]): (T | AccessibleMailbox)[] {
	const seen = new Set(rows.map((row) => row.id));
	return [...rows, ...supervised.filter((row) => !seen.has(row.id))];
}

async function listSupervisedMailboxes(db: AppDatabase, userId: string) {
	const rows = await db
		.select({
			id: mailboxes.id,
			userId: mailboxes.userId,
			domainId: mailboxes.domainId,
			localPart: mailboxes.localPart,
			displayName: mailboxes.displayName,
			signature: mailboxes.signature,
			autoReplyEnabled: mailboxes.autoReplyEnabled,
			autoReplySubject: mailboxes.autoReplySubject,
			autoReplyBody: mailboxes.autoReplyBody,
			useAllDomains: mailboxes.useAllDomains,
			avatarKey: mailboxes.avatarKey,
			type: mailboxes.type,
			disabled: mailboxes.disabled,
			createdAt: mailboxes.createdAt,
			hostname: domains.hostname,
		})
		.from(mailboxSupervisors)
		.innerJoin(mailboxes, eq(mailboxSupervisors.mailboxId, mailboxes.id))
		.innerJoin(domains, eq(mailboxes.domainId, domains.id))
		.where(and(eq(mailboxSupervisors.supervisorUserId, userId), eq(mailboxes.disabled, false)));
	return rows.map((row) => {
		const { avatarKey, ...mailbox } = row;
		return { ...mailbox, hasAvatar: !!avatarKey, permission: "read_only" as MailboxPermission, isPrimary: false, supervised: true };
	});
}

export async function listAccessibleMailboxIds(db: AppDatabase, user: Pick<SessionUser, "id" | "email" | "role">) {
	const rows = await listAccessibleMailboxes(db, user);
	return rows.map((row) => row.id);
}

function buildAccess(
	mailbox: MailboxAccessLevel["mailbox"],
	permission: MailboxPermission,
	isOwner: boolean,
	supervised = false,
): MailboxAccessLevel {
	return {
		mailbox,
		permission,
		isOwner,
		supervised,
		canRead: hasMailboxPermission(permission, "read_only"),
		canSendAs: hasMailboxPermission(permission, "send_as"),
		canSendOnBehalf: hasMailboxPermission(permission, "send_on_behalf"),
		canManage: hasMailboxPermission(permission, "full_access"),
	};
}
