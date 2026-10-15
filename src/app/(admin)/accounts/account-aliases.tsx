"use client";

import { Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AccountAliasesProps } from "./types";

export function AccountAliases({ domains, domainId, username, useAllDomains, onUseAllDomainsChange, aliases, onAliasesChange }: AccountAliasesProps) {
	const { t } = useLanguage();
	const availableDomains = domains.filter((domain) => domain.status === "active");
	return (
		<div className="space-y-4 border-t border-neutral-100 pt-4">
			<Checkbox
				checked={useAllDomains}
				onChange={(event) => onUseAllDomainsChange(event.target.checked)}
				label={t("aliases.useAll")}
				description={t("aliases.useAllHint")}
				labelClassName="rounded-xl bg-neutral-50 p-4"
			/>
			<div className="space-y-3">
				<div>
					<p className="text-sm font-medium">{t("aliases.additional")} <span className="font-normal text-neutral-500">{t("aliases.optional")}</span></p>
					<p className="mt-1 text-sm text-neutral-500">{t("aliases.hint")}</p>
				</div>
				{aliases.map((alias, index) => (
					<div key={alias.id} className="flex items-center gap-2">
						<div className="flex min-w-0 flex-1 items-center gap-1 rounded-md border border-neutral-200 bg-white">
							<Input
								aria-label={t("aliases.usernameLabel", { n: index + 1 })}
								value={alias.localPart}
								onChange={(event) => onAliasesChange(aliases.map((item) => item.id === alias.id ? { ...item, localPart: event.target.value } : item))}
								placeholder={t("accounts.username")}
								className="min-w-0 flex-1 rounded-none border-0 shadow-none"
								pattern="[a-zA-Z0-9._%+\-]+"
								maxLength={64}
								required
							/>
							<span className="text-sm text-neutral-500">@</span>
							<Select
								aria-label={t("aliases.domainLabel", { n: index + 1 })}
								value={alias.domainId}
								onValueChange={(value) => onAliasesChange(aliases.map((item) => item.id === alias.id ? { ...item, domainId: value } : item))}
								options={availableDomains.map((domain) => ({ value: domain.id, label: domain.hostname }))}
								containerClassName="min-w-0 flex-1 self-stretch rounded-none border-0 bg-transparent px-0"
								className="pl-2"
								required
							/>
						</div>
						<Button type="button" variant="ghost" size="sm" className="h-10 w-10 shrink-0 p-0" aria-label={t("aliases.remove", { n: index + 1 })} onClick={() => onAliasesChange(aliases.filter((item) => item.id !== alias.id))}>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				))}
				<Button type="button" variant="outline" disabled={!availableDomains.length} onClick={() => onAliasesChange([
					...aliases,
					{ id: crypto.randomUUID(), localPart: username.trim(), domainId: (availableDomains.find((domain) => domain.id !== domainId) ?? availableDomains[0]).id },
				])}>
					<Plus className="h-4 w-4" /> {t("aliases.add")}
				</Button>
			</div>
		</div>
	);
}
