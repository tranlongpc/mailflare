"use client";

import { mobilePrimaryActionClass } from "@/components/page-header-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, UsersRound } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { List, ListRow } from "@/components/ui/list";
import { SectionRowSkeleton } from "@/components/page-skeletons";
import { clearMailboxesCache } from "@/components/mailbox-provider-utils";
import { ProgressiveAvatarImage } from "@/components/progressive-avatar-image";
import { authFetch } from "@/lib/auth/client";
import type { CurrentAccountResponse, Domain, MailboxOwner, MailboxesResponse } from "./types";
import { getMailboxAddress, getMailboxesBase, getMailboxName } from "./utils";

export default function MailboxesPage() {
	const { t } = useLanguage();
	const qc = useQueryClient();
	const router = useRouter();
	const base = getMailboxesBase(usePathname());
	const [displayName, setDisplayName] = useState("");
	const [localPart, setLocalPart] = useState("");
	const [domainId, setDomainId] = useState("");
	const [ownerUserId, setOwnerUserId] = useState("");
	const [mailboxType, setMailboxType] = useState<"personal" | "shared">("personal");
	const [createOpen, setCreateOpen] = useState(false);

	const account = useQuery({
		queryKey: ["auth", "me"],
		queryFn: async () => {
			const res = await authFetch("/api/auth/me", { redirectOnUnauthorized: false });
			return (await res.json()) as CurrentAccountResponse;
		},
	});

	useEffect(() => {
		if (!createOpen) return;
		setDisplayName((currentName) => currentName || account.data?.user?.name?.trim() || "");
		setOwnerUserId((currentId) => currentId || account.data?.user?.id || "");
	}, [account.data?.user?.id, account.data?.user?.name, createOpen]);

	const accounts = useQuery({
		queryKey: ["accounts", "mailbox-owners"],
		queryFn: async () => {
			const res = await authFetch("/api/accounts");
			if (!res.ok) return { accounts: [] as MailboxOwner[] };
			return (await res.json()) as { accounts: MailboxOwner[] };
		},
		enabled: createOpen,
	});

	const domains = useQuery({
		queryKey: ["domains"],
		queryFn: async () => {
			const res = await authFetch("/api/domains");
			return (await res.json()) as { domains: Domain[] };
		},
	});

	const mailboxes = useQuery({
		queryKey: ["mailboxes"],
		queryFn: async () => {
			const res = await authFetch("/api/mailboxes");
			return (await res.json()) as MailboxesResponse;
		},
	});

	const create = useMutation({
		mutationFn: async () => {
			const res = await authFetch("/api/mailboxes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					domainId,
					...(mailboxType === "personal" ? { ownerUserId } : {}),
					localPart,
					displayName: displayName.trim(),
					type: mailboxType,
				}),
			});
			const json = (await res.json()) as { id?: string; error?: string };
			if (!res.ok) throw new Error(json.error ?? t("mailboxes.failed"));
			setDisplayName("");
			setLocalPart("");
			setDomainId("");
			setOwnerUserId("");
			return json.id;
		},
		onSuccess: (mailboxId) => {
			clearMailboxesCache();
			setCreateOpen(false);
			qc.invalidateQueries({ queryKey: ["mailboxes"] });
			if (mailboxType === "shared" && mailboxId) router.push(`${base}/${mailboxId}`);
			setMailboxType("personal");
		},
	});

	const domainMap = new Map(
		(domains.data?.domains ?? []).map((d) => [d.id, d.hostname]),
	);
	const mailboxOwners = [...(accounts.data?.accounts ?? [])];
	if (account.data?.user?.id && !mailboxOwners.some((owner) => owner.id === account.data?.user?.id)) {
		mailboxOwners.unshift({
			id: account.data.user.id,
			email: account.data.user.email ?? "",
			name: account.data.user.name ?? account.data.user.email ?? t("mailboxes.currentAccount"),
			role: "admin",
		});
	}

	return (
		<div className="space-y-6">
			<PageHeader
				className="items-center"
				title={t("mailboxes.title")}
				actions={
					<Button className={mobilePrimaryActionClass} onClick={() => setCreateOpen(true)}>
						<Plus className="h-4 w-4" />
						{t("mailboxes.new")}
					</Button>
				}
			/>
				<Dialog
					open={createOpen}
					onOpenChange={setCreateOpen}
					title={t("mailboxes.createTitle")}
					description={t("mailboxes.createDescription")}
				>
						<div className="space-y-4">
							{mailboxes.data?.canCreateShared && (
								<FormField label={t("mailboxes.type")} htmlFor="mailbox-type">
									<Select
										id="mailbox-type"
										value={mailboxType}
										onValueChange={(value) => setMailboxType(value as "personal" | "shared")}
										containerClassName="w-full rounded-md shadow-sm shadow-neutral-200/50"
										className="text-sm"
										options={[
											{ value: "personal", label: t("mailboxes.personalInbox") },
											{ value: "shared", label: t("mailboxes.sharedInbox") },
										]}
									/>
								</FormField>
							)}
							{mailboxType === "personal" ? (
							<FormField label={t("mailboxes.account")} htmlFor="mailbox-owner">
								<Select
									id="mailbox-owner"
									value={ownerUserId}
									onValueChange={(value) => {
										const owner = mailboxOwners.find((item) => item.id === value);
										setOwnerUserId(value);
										if (owner) setDisplayName(owner.name);
									}}
									containerClassName="w-full rounded-md shadow-sm shadow-neutral-200/50"
									className="text-sm"
									options={mailboxOwners.map((owner) => ({
										value: owner.id,
										label: `${owner.name} (${owner.email})`,
									}))}
								/>
							</FormField>
							) : (
								<p className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
									{t("mailboxes.sharedHint")}
								</p>
							)}
							<FormField label={t("common.name")} htmlFor="mailbox-name">
								<Input
									id="mailbox-name"
									value={displayName}
									onChange={(event) => setDisplayName(event.target.value)}
									placeholder={t("mailboxes.namePlaceholder")}
								/>
							</FormField>
							<FormField label={t("mailboxes.emailAddress")} htmlFor="mailbox-username">
								<div className="flex h-10 overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm shadow-neutral-200/50 focus-within:border-blue-600">
									<Input
										id="mailbox-username"
										value={localPart}
										onChange={(event) => setLocalPart(event.target.value)}
										placeholder={t("mailboxes.localPlaceholder")}
										className="min-w-0 flex-1 rounded-none border-0 shadow-none focus-visible:border-0"
									/>
									<span className="flex items-center text-sm text-neutral-500">@</span>
									<Select
										aria-label={t("accounts.domain")}
										variant="bare"
										containerClassName="min-w-0 max-w-[55%]"
										className="pl-3 text-sm text-neutral-700"
										value={domainId}
										onValueChange={setDomainId}
										placeholder={t("accounts.selectDomain")}
										options={(domains.data?.domains ?? []).map((domain) => ({
											value: domain.id,
											label: domain.hostname,
										}))}
									/>
								</div>
							</FormField>
							{create.isError && (
								<p role="alert" className="text-sm text-red-600">{(create.error as Error).message}</p>
							)}
							<Button
								onClick={() => create.mutate()}
								disabled={(mailboxType === "personal" && !ownerUserId) || !displayName.trim() || !domainId || !localPart || create.isPending}
							>
								{create.isPending ? t("accounts.creating") : t("mailboxes.createButton")}
							</Button>
						</div>
				</Dialog>
			<section className="space-y-3">
				{/* <div className="flex items-center justify-between">
					<span className="text-sm text-neutral-500">
						{(mailboxes.data?.mailboxes ?? []).length} total
					</span>
				</div> */}
				{mailboxes.isLoading && (
					<SectionRowSkeleton />
				)}
				{!mailboxes.isLoading && (mailboxes.data?.mailboxes ?? []).length === 0 && (
					<p className="rounded-2xl bg-white px-5 py-4 text-sm text-neutral-500">
						{t("mailboxes.none")}
					</p>
				)}
				<List>
					{(mailboxes.data?.mailboxes ?? []).map((mailbox) => {
						const mailboxWithHostname = {
							...mailbox,
							hostname: mailbox.hostname ?? domainMap.get(mailbox.domainId) ?? "?",
						};

						return (
							<ListRow key={mailbox.id} asChild>
								<Link
									href={`${base}/${mailbox.id}`}
									className="group px-5 py-4 transition-colors hover:bg-blue-50/40"
								>
									<span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
										{getMailboxName(mailboxWithHostname).trim().charAt(0).toUpperCase() || "?"}
										{mailbox.hasAvatar && (
											<ProgressiveAvatarImage
												src={`/api/mailboxes/${mailbox.id}/avatar`}
												alt={t("mailboxes.profileAlt", { name: getMailboxName(mailboxWithHostname) })}
												className="absolute inset-0 h-full w-full object-cover"
											/>
										)}
									</span>
									<span className="min-w-0">
										<span className="flex min-w-0 items-center gap-2">
											<span className="block truncate text-sm font-semibold text-neutral-900">
												{getMailboxName(mailboxWithHostname)}
											</span>
											{mailbox.type === "shared" && (
												<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
													<UsersRound className="h-3 w-3" />
													{t("mailboxes.shared")}
												</span>
											)}
										</span>
										<span className="block truncate no-font-mono text-sm text-neutral-500">
											{getMailboxAddress(mailboxWithHostname)}
										</span>
									</span>
								</Link>
							</ListRow>
						);
					})}
				</List>
			</section>
		</div>
	);
}
