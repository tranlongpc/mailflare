"use client";

import { mobilePrimaryActionClass } from "@/components/page-header-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { List, ListRow } from "@/components/ui/list";
import { PageHeader } from "@/components/shared/page-header";
import { SectionRowSkeleton } from "@/components/page-skeletons";
import { McpAgentInstructions } from "@/components/settings/mcp-agent-instructions";
import { authFetch } from "@/lib/auth/client";
import type { AdminApiKeyScope } from "@/lib/api/scopes-types";
import type { ApiKey } from "./types";
import { ADMIN_KEY_PERMISSIONS, parseApiKeyScopes } from "./utils";

export default function ApiKeysPage() {
	const { t } = useLanguage();
	const qc = useQueryClient();
	const [name, setName] = useState("");
	const [scopes, setScopes] = useState<AdminApiKeyScope[]>(["domains"]);
	const [mcpAllowed, setMcpAllowed] = useState(false);
	const [createdMcpAllowed, setCreatedMcpAllowed] = useState(false);
	const [newKey, setNewKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);

	const { data, isLoading } = useQuery({
		queryKey: ["admin-api-keys"],
		queryFn: async () => {
			const res = await authFetch("/api/admin/api-keys");
			if (!res.ok) throw new Error(t("adminKeys.loadFailed"));
			return (await res.json()) as { apiKeys: ApiKey[] };
		},
	});

	const create = useMutation({
		mutationFn: async () => {
			const res = await authFetch("/api/admin/api-keys", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: name.trim(), scopes, mcpAllowed }),
			});
			const json = (await res.json()) as { key?: string; error?: string };
			if (!res.ok || !json.key) throw new Error(typeof json.error === "string" ? json.error : t("apiKeys.createFailed"));
			setNewKey(json.key ?? null);
			setCreatedMcpAllowed(mcpAllowed);
			setCopied(false);
			setName("");
		},
		onSuccess: () => {
			setScopes(["domains"]);
			qc.invalidateQueries({ queryKey: ["admin-api-keys"] });
		},
	});
	const revoke = useMutation({
		mutationFn: async (id: string) => {
			const res = await authFetch(`/api/admin/api-keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
			if (!res.ok) throw new Error(t("adminKeys.revokeFailed"));
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-api-keys"] }),
	});

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("admin.section.apiKeysTitle")}
				actions={
					<Button className={mobilePrimaryActionClass} onClick={() => setCreateOpen(true)}>
						<Plus className="h-4 w-4" />
						{t("apiKeys.new")}
					</Button>
				}
			/>
			<Dialog
				open={createOpen}
				onOpenChange={(open) => { if (create.isPending) return; setCreateOpen(open); if (!open) { setNewKey(null); setCopied(false); } }}
				title={newKey ? t("apiKeys.createdTitle") : t("apiKeys.createTitle")}
				description={newKey ? t("apiKeys.copyNow") : t("apiKeys.nameAndAccess")}
			>
				{!newKey && <div className="space-y-4">
				<FormField label={t("apiKeys.keyName")} htmlFor="admin-key-name">
					<Input id="admin-key-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={t("adminKeys.namePlaceholder")} />
				</FormField>
				<Checkbox checked={mcpAllowed} onChange={(event) => setMcpAllowed(event.target.checked)} label={<strong>{t("apiKeys.allowMcp")}</strong>} description={t("adminKeys.allowMcpHint")} />
				<fieldset className="space-y-2">
					<legend className="text-sm font-medium">{t("apiKeys.permissions")}</legend>
					<div className="space-y-2">
						{ADMIN_KEY_PERMISSIONS.map((scope) => (
							<Checkbox
								key={scope.value}
								checked={scopes.includes(scope.value)}
								className="mt-1"
								label={<strong>{t(scope.labelKey)}</strong>}
								description={t(scope.descriptionKey)}
								onChange={(event) =>
									setScopes((current) =>
										event.target.checked
											? [...current, scope.value]
											: current.filter((item) => item !== scope.value),
									)
								}
							/>
						))}
					</div>
				</fieldset>
				{create.isError && (
					<p role="alert" className="text-sm text-red-600">{(create.error as Error).message}</p>
				)}
				<Button
					onClick={() => create.mutate()}
					disabled={!name.trim() || scopes.length === 0 || create.isPending}
				>
					{create.isPending ? t("accounts.creating") : t("adminKeys.createKey")}
				</Button>
				</div>}
				{newKey && <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4"><code className="block break-all rounded bg-white p-2 text-xs">{newKey}</code>{createdMcpAllowed && <McpAgentInstructions mode="admin" apiKey={newKey} />}<div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(newKey).then(() => setCopied(true))}><Copy className="h-4 w-4" />{copied ? t("common.copied") : t("apiKeys.copyKey")}</Button><Button type="button" size="sm" variant="ghost" onClick={() => { setCreateOpen(false); setNewKey(null); setCopied(false); }}>{t("common.done")}</Button></div></div>}
			</Dialog>
			<section className="space-y-3">
				{revoke.isError && <p role="alert" className="text-sm text-red-600">{revoke.error.message}</p>}
				{isLoading && (
					<SectionRowSkeleton />
				)}
				{!isLoading && (data?.apiKeys ?? []).length === 0 && (
					<p className="rounded-2xl bg-white px-5 py-4 text-sm text-neutral-500">
						{t("apiKeys.none")}
					</p>
				)}
				<List>
					{(data?.apiKeys ?? []).map((key) => (
						<ListRow
							key={key.id}
							className="px-5 py-4"
						>
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
								<KeyRound className="h-5 w-5" />
							</span>
							<span className="min-w-0 flex-1 space-y-2">
								<span className="flex min-w-0 flex-wrap items-center gap-2"><strong className="truncate text-sm font-semibold text-neutral-900">{key.name}</strong>{key.kind === "mcp" && <Badge variant="outline">MCP</Badge>}</span>
								<span className="block truncate no-font-mono text-sm text-neutral-500">{key.prefix}...</span>
								<span className="flex flex-wrap gap-1">
									{parseApiKeyScopes(key.scopes).map((scope) => (
										<Badge key={scope} variant="outline">
											{scope}
										</Badge>
									))}
								</span>
							</span>
						<Button type="button" size="sm" variant="outline" disabled={revoke.isPending} onClick={() => { if (window.confirm(t("apiKeys.revokeConfirm", { name: key.name }))) revoke.mutate(key.id); }}><Trash2 className="h-4 w-4" />{t("common.revoke")}</Button>
						</ListRow>
					))}
				</List>
			</section>
		</div>
	);
}
