"use client";

import { mobilePrimaryActionClass } from "@/components/page-header-utils";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { authFetch } from "@/lib/auth/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { defaultTranslator } from "@/lib/i18n/utils";
import { AccountAliases } from "./account-aliases";
import { AccountsTable } from "./accounts-table";
import { DeleteAccountsDialog } from "./delete-accounts-dialog";
import type { Account, AccountAliasDraft, AccountResponse, Domain } from "./types";

async function fetchAccounts(): Promise<AccountResponse> {
	const response = await authFetch("/api/accounts");
	const data = (await response.json()) as AccountResponse;
	if (!response.ok) throw new Error(data.error ?? defaultTranslator("accounts.loadFailed"));
	return data;
}

export default function AccountsPage() {
	const { t } = useLanguage();
	const currentUser = useCurrentUser();
	const canManage = !!currentUser && (currentUser.isPrimaryAdmin || currentUser.canManageUsers);
	const canChooseRole = !!currentUser?.isPrimaryAdmin;
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [domains, setDomains] = useState<Domain[]>([]);
	const [username, setUsername] = useState("");
	const [domainId, setDomainId] = useState("");
	const [role, setRole] = useState<"admin" | "user">("user");
	const [password, setPassword] = useState("");
	const [useAllDomains, setUseAllDomains] = useState(false);
	const [aliases, setAliases] = useState<AccountAliasDraft[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [seats, setSeats] = useState<AccountResponse["seats"] | null>(null);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [restoringId, setRestoringId] = useState<string | null>(null);

	async function loadAccounts() {
		const data = await fetchAccounts();
		setAccounts(data.accounts ?? []);
		setSeats(data.seats ?? null);
	}

	useEffect(() => {
		fetchAccounts().then(async (list) => {
			setAccounts(list.accounts ?? []);
			setSeats(list.seats ?? null);
			const response = await authFetch("/api/domains");
			const data = (await response.json()) as { domains?: Domain[]; error?: string };
			if (!response.ok) throw new Error(data.error ?? t("accounts.domainsFailed"));
			setDomains(data.domains ?? []);
			setDomainId(data.domains?.[0]?.id ?? "");
		}).catch((error) => {
			const text = error instanceof Error ? error.message : t("accounts.loadFailed");
			setMessage(text);
		}).finally(() => setLoading(false));
	}, []);

	async function createAccount(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setMessage(null);
		try {
			const response = await authFetch("/api/accounts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ username, domainId, password, role, useAllDomains, aliases: aliases.map(({ domainId, localPart }) => ({ domainId, localPart })) }),
			});
			const data = (await response.json()) as AccountResponse;
			if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : t("accounts.checkDetails"));
			setUsername("");
			setPassword("");
			setUseAllDomains(false);
			setAliases([]);
			setCreateOpen(false);
			await loadAccounts();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("accounts.createFailed"));
		} finally {
			setSaving(false);
		}
	}

	async function restoreAccount(account: Account) {
		setRestoringId(account.id);
		setMessage(null);
		try {
			const response = await authFetch(`/api/accounts/${account.id}/restore`, { method: "POST" });
			const data = (await response.json()) as { error?: string };
			if (!response.ok) throw new Error(data.error ?? t("accounts.restoreFailed"));
			await loadAccounts();
		} catch (error) {
			setMessage(error instanceof Error ? error.message : t("accounts.restoreFailed"));
		} finally {
			setRestoringId(null);
		}
	}

	const seatsFull = !!seats && seats.limit !== null && seats.used >= seats.limit;

	return <div className="space-y-6">
		<PageHeader title={t("accounts.title")} description={t("accounts.description")} actions={canManage && <Button disabled={seatsFull} className={mobilePrimaryActionClass} onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />{t("accounts.new")}</Button>}>{seats && seats.limit !== null && <p className={`mt-1 text-sm ${seatsFull ? "text-amber-700" : "text-neutral-500"}`}>{t("accounts.seatsUsed", { used: seats.used, limit: seats.limit })}{seatsFull ? ` ${t("accounts.seatsFull")}` : ""}</p>}</PageHeader>
		{message && !createOpen && <p role="alert" className="text-sm text-red-600">{message}</p>}
		<div className="relative">
			<AccountsTable accounts={accounts} currentUserId={currentUser?.id} isPrimaryAdmin={!!currentUser?.isPrimaryAdmin} loading={loading} selected={selected} onSelectedChange={setSelected} onDeleteSelected={() => setDeleteOpen(true)} onRestore={restoreAccount} restoringId={restoringId} />
		</div>
		<DeleteAccountsDialog open={deleteOpen} onOpenChange={setDeleteOpen} accounts={accounts.filter((account) => selected.has(account.id))} candidates={accounts} onDeleted={async () => { setDeleteOpen(false); setSelected(new Set()); await loadAccounts(); }} />
		<Dialog open={createOpen} onOpenChange={setCreateOpen} className="w-[min(640px,calc(100vw-32px))]" title={t("accounts.addTitle")} description={t("accounts.addDescription")}><form onSubmit={createAccount}><fieldset disabled={saving} className="space-y-4">
			<FormField label={t("auth.email")} htmlFor="account-username"><div className="flex h-10 overflow-hidden rounded-md border border-neutral-200 bg-white"><Input id="account-username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder={t("accounts.username")} className="min-w-0 flex-1 rounded-none border-0 shadow-none" required /><span className="flex items-center text-sm text-neutral-500">@</span><Select aria-label={t("accounts.domain")} value={domainId} onValueChange={setDomainId} placeholder={t("accounts.selectDomain")} options={domains.map((domain) => ({ value: domain.id, label: domain.hostname }))} containerClassName="h-auto min-w-0 max-w-[55%] shrink-0 rounded-none border-0 bg-transparent" required /></div></FormField>
			<FormField label={t("auth.password")} htmlFor="account-password"><Input id="account-password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></FormField>
			{canChooseRole && <FormField label={t("accounts.role")} htmlFor="account-role"><Select id="account-role" value={role} onValueChange={(value) => setRole(value as "admin" | "user")} options={[{ value: "user", label: t("accounts.roleUser") }, { value: "admin", label: t("accounts.roleAdmin") }]} containerClassName="w-full" /></FormField>}
			<AccountAliases domains={domains} domainId={domainId} username={username} useAllDomains={useAllDomains} onUseAllDomainsChange={setUseAllDomains} aliases={aliases} onAliasesChange={setAliases} />
			{message && <p role="alert" className="text-sm text-red-600">{message}</p>}<Button type="submit" disabled={saving || !domainId}>{saving ? t("accounts.creating") : t("accounts.create")}</Button>
		</fieldset></form></Dialog>
	</div>;
}
