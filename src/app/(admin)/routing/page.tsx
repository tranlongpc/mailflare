"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/components/language-provider";
import { DomainRouting } from "@/components/settings/domain-routing/domain-routing";
import { RoutingRuleSelect } from "@/components/settings/domain-routing/routing-rule-select";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAdminRoutingDomains } from "./utils";

export default function RoutingPage() {
	const { t } = useLanguage();
	const [domainId, setDomainId] = useState("");
	const domains = useQuery({
		queryKey: ["admin-routing-domains"],
		queryFn: fetchAdminRoutingDomains,
	});
	const availableDomains = domains.data?.domains ?? [];
	const selectedDomain = availableDomains.find((domain) => domain.id === domainId) ?? availableDomains[0];

	return (
		<div className="space-y-8">
			<PageHeader title={t("routingAdmin.title")} description={t("routingAdmin.description")} />

			<section className="space-y-4">
				<div>
					<h2 className="text-xl font-semibold text-neutral-900">{t("routingAdmin.domain")}</h2>
					<p className="mt-1 text-sm text-neutral-500">{t("routingAdmin.chooseDomain")}</p>
				</div>
				<Card>
					{domains.isLoading ? (
						<Skeleton className="h-10 w-full" />
					) : domains.isError ? (
						<p role="alert" className="text-sm text-red-600">{domains.error.message}</p>
					) : availableDomains.length === 0 ? (
						<p className="text-sm text-neutral-500">{t("routingAdmin.addDomainFirst")}</p>
					) : (
						<FormField label={t("routingAdmin.managedDomain")} htmlFor="routing-domain">
							<RoutingRuleSelect
								id="routing-domain"
								value={selectedDomain?.id ?? ""}
								onValueChange={setDomainId}
								options={availableDomains.map((domain) => ({
									value: domain.id,
									label: domain.hostname,
								}))}
							/>
						</FormField>
					)}
				</Card>
			</section>

			{selectedDomain && <DomainRouting key={selectedDomain.id} domain={selectedDomain} />}
		</div>
	);
}
