export type ManagedAccount = {
	id: string;
	email: string;
	name: string;
	role: "admin" | "user";
	isPrimaryAdmin: boolean;
	disabled: boolean;
	canManageMailboxes: boolean;
	canManageDomains: boolean;
	canManageUsers: boolean;
	forwardingEmail: string | null;
	canForwardEmail: boolean;
	hasAvatar: boolean;
	/** Whether the signed-in admin may modify this account. */
	editable: boolean;
	/** Whether the signed-in admin may change this account's role. */
	canChangeRole: boolean;
	/** Whether the signed-in admin may hand the primary role to this account. */
	canTransferPrimary: boolean;
	/** Only ever set client-side when an admin types a new password; never returned by the API. */
	newPassword?: string;
};

export type ManagedMailbox = {
	id: string;
	localPart: string;
	displayName: string | null;
	domainId: string;
	hostname: string;
};

export type ManagedDomain = { id: string; hostname: string };

export type ManagedAccountResponse = {
	account?: ManagedAccount;
	error?: string;
};

export type AccountDetail = ManagedAccount;
export type DomainOption = ManagedDomain;
export type AccountMailboxItem = ManagedMailbox;

export type AccountDetailResponse = ManagedAccountResponse;

export type AccountMailboxAccessItem = ManagedMailbox & {
	mailboxId: string;
	permission?: "read_only" | "send_as" | "send_on_behalf" | "full_access";
};

export type AccountMailboxAccessResponse = {
	mailboxes: AccountMailboxAccessItem[];
	error?: string;
};

/** Another account with read-only, owner-invisible access to one of this account's mailboxes. */
export type MailboxSupervisor = { mailboxId: string; userId: string; name: string; email: string };

export type MailboxSupervisionResponse = {
	supervisors: MailboxSupervisor[];
	candidates: { id: string; name: string; email: string }[];
	error?: string;
};
