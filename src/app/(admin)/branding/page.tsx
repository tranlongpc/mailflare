"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Palette } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useBranding } from "@/components/branding-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { BRANDING_ICON_ACCEPT, saveBranding } from "./utils";

export default function BrandingPage() {
	const { t } = useLanguage();
	const branding = useBranding();
	const [appName, setAppName] = useState(branding.appName);
	const [icon, setIcon] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [status, setStatus] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setAppName(branding.appName);
	}, [branding.appName]);

	function pickIcon(file: File | null) {
		setIcon(file);
		if (preview) URL.revokeObjectURL(preview);
		setPreview(file ? URL.createObjectURL(file) : null);
	}

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setStatus(null);
		try {
			await saveBranding(appName.trim(), icon);
			await branding.refreshBranding();
			setIcon(null);
			setStatus(t("branding.updated"));
		} catch (error) {
			setStatus(error instanceof Error ? error.message : t("branding.saveFailed"));
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-6">
			<PageHeader title={t("branding.title")} description={t("branding.description")} />
			<Card
				className="gap-6"
				title={<span className="flex items-center gap-2"><Palette className="h-5 w-5" />{t("branding.identity")}</span>}
				description={t("branding.faviconNote")}
			>
				<Form onSubmit={submit} spacing="relaxed">
					<FormField label={t("branding.appName")} htmlFor="appName">
						<Input id="appName" value={appName} maxLength={60} onChange={(event) => setAppName(event.target.value)} required />
					</FormField>
					<FormField label={t("branding.appIcon")}>
						<Input ref={inputRef} type="file" variant="bare" accept={BRANDING_ICON_ACCEPT} className="hidden" onChange={(event) => pickIcon(event.target.files?.[0] ?? null)} />
						<Button type="button" variant="unstyled" onClick={() => inputRef.current?.click()} className="flex items-center gap-4 rounded-2xl border border-dashed border-neutral-300 p-4 text-left hover:bg-neutral-50">
							<img src={preview ?? branding.iconUrl} alt={t("branding.iconPreview")} className="h-16 w-16 rounded-2xl object-cover" />
							<span className="text-sm text-neutral-600"><ImagePlus className="mb-1 h-5 w-5" />{t("branding.chooseImage")}<br /><span className="text-xs text-neutral-500">{t("branding.maxSize")}</span></span>
						</Button>
					</FormField>
					{status && <p role="status" className="text-sm text-neutral-600">{status}</p>}
					<Button type="submit" disabled={saving || !appName.trim()}>{saving ? t("common.saving") : t("branding.save")}</Button>
				</Form>
			</Card>
		</div>
	);
}
