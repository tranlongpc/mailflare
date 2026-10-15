export type LicensePlan = "community" | "pro" | "team";

export type LicenseEntitlements = {
	plan: LicensePlan;
	canCustomizeBranding: boolean;
	canManageAccounts: boolean;
	/** Shared inboxes, mailbox sharing and booking hosts: Team only. */
	canShareMailboxes: boolean;
	/** Maximum enabled accounts; null is unlimited. */
	accountSeatLimit: number | null;
	canForwardEmail: boolean;
};
