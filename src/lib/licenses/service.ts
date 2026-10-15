import type { LicenseEntitlements } from "./types";

/**
 * This is an internal deployment: every installation runs with Team entitlements
 * and no license key is ever checked against Paymug.
 */
const TEAM_ENTITLEMENTS: LicenseEntitlements = {
	plan: "team",
	canCustomizeBranding: true,
	canManageAccounts: true,
	canShareMailboxes: true,
	accountSeatLimit: null,
	canForwardEmail: true,
};

export async function getLicenseEntitlements(_env: CloudflareEnv): Promise<LicenseEntitlements> {
	return TEAM_ENTITLEMENTS;
}
