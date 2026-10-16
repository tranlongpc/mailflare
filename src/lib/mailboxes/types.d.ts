import type { mailboxes } from "@/db/schema";

export type MailboxPermission = "read_only" | "send_as" | "send_on_behalf" | "full_access";

export type MailboxType = "personal" | "shared";

export type MailboxAccessLevel = {
	mailbox: typeof mailboxes.$inferSelect;
	permission: MailboxPermission;
	isOwner: boolean;
	canRead: boolean;
	canSendAs: boolean;
	canSendOnBehalf: boolean;
	canManage: boolean;
	/** Hidden read-only supervision: may look, but must not change anything the owner would see (read state, stars). */
	supervised: boolean;
};

export type AuditAction =
	| "auth.login"
	| "auth.logout"
	| "email.send"
	| "email.read"
	| "email.delete"
	| "permission.change"
	| "mailbox.access"
	| "email.supervisor_view"
	| "mailbox.supervisor_grant"
	| "mailbox.supervisor_revoke"
	| "auth.impersonate";

export type AuditLogInput = {
	actorUserId?: string | null;
	targetUserId?: string | null;
	mailboxId?: string | null;
	messageId?: string | null;
	action: AuditAction | string;
	metadata?: Record<string, unknown>;
};
