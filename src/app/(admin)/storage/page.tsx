"use client";

import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BUNNY_STORAGE_REGIONS, guessStorageRegion, normalizeB2Endpoint } from "@/lib/storage/b2-config";
import type { StorageAdminResponse, StoragePreset } from "@/lib/storage/b2-types";
import type { TranslationKey } from "@/lib/i18n/types";
import type { StorageForm } from "./types";
import { loadStorage, revertStorage, saveStorage, STORAGE_PRESETS, storageFormFrom, testActiveStorage } from "./utils";

const providerLabels: Record<StorageAdminResponse["status"]["provider"], TranslationKey> = {
	custom: "storage.provider.custom",
	bunny: "storage.provider.bunny",
	backblaze: "storage.provider.backblaze",
	s3: "storage.provider.s3",
	r2: "storage.provider.r2",
	files: "storage.provider.files",
};

const sourceLabels: Record<NonNullable<StorageAdminResponse["status"]["source"]>, TranslationKey> = {
	settings: "storage.source.settings",
	environment: "storage.source.environment",
	default: "storage.source.default",
};

export default function StorageSettingsPage() {
	const { t } = useLanguage();
	const [data, setData] = useState<StorageAdminResponse | null>(null);
	const [form, setForm] = useState<StorageForm>(storageFormFrom(null));
	const [busy, setBusy] = useState<"" | "save" | "test" | "revert">("");
	const [currentStatus, setCurrentStatus] = useState<{ text: string; error: boolean } | null>(null);
	const [formStatus, setFormStatus] = useState<{ text: string; error: boolean } | null>(null);
	const [origin, setOrigin] = useState("");

	useEffect(() => {
		let active = true;
		setOrigin(window.location.origin);
		void loadStorage().then((next) => { if (active) { setData(next); setForm(storageFormFrom(next.saved)); } })
			.catch((error) => { if (active) setCurrentStatus({ text: error instanceof Error ? error.message : t("storage.loadFailed"), error: true }); });
		return () => { active = false; };
	}, [t]);

	const preset = STORAGE_PRESETS.find((item) => item.id === form.preset) ?? STORAGE_PRESETS[0];
	const regionHint = guessStorageRegion(normalizeB2Endpoint(form.endpoint)) ?? "us-east-1";
	const bunny = form.preset === "bunny";
	const saved = data?.saved;
	const savedSecret = !!saved && saved.preset === form.preset && saved.accessKeyId === (bunny ? "" : form.accessKeyId.trim()) && (!bunny || (saved.bucket === form.bucket.trim() && saved.endpoint === form.endpoint));
	const update = (changes: Partial<StorageForm>) => setForm((current) => ({ ...current, ...changes }));

	async function save(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy("save");
		setFormStatus(null);
		try {
			const next = await saveStorage(form);
			if (next.error) { setFormStatus({ text: next.error, error: true }); return; }
			setData(next);
			setForm(storageFormFrom(next.saved));
			setFormStatus({ text: t("storage.saved"), error: false });
		} catch (error) {
			setFormStatus({ text: error instanceof Error ? error.message : t("storage.saveFailed"), error: true });
		} finally { setBusy(""); }
	}

	async function test() {
		setBusy("test");
		setCurrentStatus(null);
		try {
			const next = await testActiveStorage();
			setData(next);
			setCurrentStatus(next.test?.ok ? { text: t("storage.testOk", { ms: next.test.latencyMs }), error: false } : { text: t("storage.testFailed", { error: next.test?.error ?? "" }), error: true });
		} catch (error) {
			setCurrentStatus({ text: error instanceof Error ? error.message : t("storage.testFailed", { error: "" }), error: true });
		} finally { setBusy(""); }
	}

	async function revert() {
		setBusy("revert");
		setCurrentStatus(null);
		try {
			const next = await revertStorage();
			setData(next);
			setForm(storageFormFrom(null));
			setCurrentStatus({ text: t("storage.reverted"), error: false });
		} catch (error) {
			setCurrentStatus({ text: error instanceof Error ? error.message : t("storage.saveFailed"), error: true });
		} finally { setBusy(""); }
	}

	const status = data?.status;
	return <div className="space-y-6">
		<PageHeader title={t("storage.title")} description={t("storage.description")} />
		<Card className="gap-5" title={<span className="flex items-center gap-2"><HardDrive className="h-5 w-5" />{t("storage.current")}</span>} actions={<>
			<Button type="button" variant="outline" size="sm" disabled={!status || !!busy} onClick={() => void test()}>{busy === "test" ? t("storage.testing") : t("storage.test")}</Button>
			{status?.source === "settings" && <Button type="button" variant="ghost" size="sm" disabled={!!busy} onClick={() => void revert()}>{t("storage.revert")}</Button>}
		</>}>
			{status ? <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
				<dt className="text-neutral-500">{t("storage.provider")}</dt>
				<dd className="flex flex-wrap items-center gap-2 text-neutral-900">{t(providerLabels[status.provider])}{status.source && <Badge variant="secondary">{t(sourceLabels[status.source])}</Badge>}</dd>
				{status.bucket && <><dt className="text-neutral-500">{t("storage.bucket")}</dt><dd className="break-all text-neutral-900">{status.bucket}</dd></>}
				{status.endpoint && <><dt className="text-neutral-500">{t("storage.endpoint")}</dt><dd className="break-all text-neutral-900">{status.endpoint}</dd></>}
				<dt className="text-neutral-500">{t("storage.driveUploads")}</dt>
				<dd><Badge variant={status.directUploads ? "success" : "outline"}>{status.directUploads ? t("storage.directOn") : t("storage.directOff")}</Badge></dd>
			</dl> : !currentStatus && <p className="text-sm text-neutral-500">{t("common.loading")}</p>}
			{data?.warning && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{data.warning}</p>}
			{currentStatus && <p role="status" className={currentStatus.error ? "text-sm text-red-700" : "text-sm text-neutral-700"}>{currentStatus.text}</p>}
		</Card>
		<Card className="gap-6" title={t("storage.custom")} description={t("storage.customHint")}>
			<Form onSubmit={save}>
				<FormField label={t("storage.provider")} htmlFor="storage-preset"><Select id="storage-preset" containerClassName="w-full" value={form.preset} disabled={!data || !!busy} options={STORAGE_PRESETS.map((item) => ({ value: item.id, label: item.label ?? t("storage.presetCustom") }))} onValueChange={(value) => { const next = STORAGE_PRESETS.find((item) => item.id === value); update({ preset: value as StoragePreset, pathStyle: next?.pathStyle ?? false, ...(value === "bunny" && !BUNNY_STORAGE_REGIONS.some((region) => region.endpoint === form.endpoint) ? { endpoint: BUNNY_STORAGE_REGIONS[0].endpoint } : {}) }); }} /></FormField>
				{bunny ? <>
					<FormField label={t("storage.bunnyRegion")} htmlFor="storage-bunny-region"><Select id="storage-bunny-region" containerClassName="w-full" value={form.endpoint} disabled={!data || !!busy} options={BUNNY_STORAGE_REGIONS.map((region) => ({ value: region.endpoint, label: `${region.label} · ${region.endpoint}` }))} onValueChange={(endpoint) => update({ endpoint })} /></FormField>
					<div className="grid gap-4 sm:grid-cols-2">
						<FormField label={t("storage.bunnyZone")} htmlFor="storage-bucket"><Input id="storage-bucket" value={form.bucket} placeholder="mailflare" autoComplete="off" spellCheck={false} disabled={!data || !!busy} onChange={(event) => update({ bucket: event.target.value })} required /></FormField>
						<FormField label={t("storage.bunnyPassword")} htmlFor="storage-secret" description={savedSecret ? t("storage.secretSaved") : t("storage.bunnyPasswordHint")}><Input id="storage-secret" type="password" value={form.secretAccessKey} autoComplete="new-password" disabled={!data || !!busy} onChange={(event) => update({ secretAccessKey: event.target.value })} required={!savedSecret} /></FormField>
					</div>
				</> : <>
					<FormField label={t("storage.endpoint")} htmlFor="storage-endpoint" description={t("storage.endpointHint")}><Input id="storage-endpoint" value={form.endpoint} placeholder={preset.endpointExample} autoComplete="off" spellCheck={false} disabled={!data || !!busy} onChange={(event) => update({ endpoint: event.target.value })} required /></FormField>
					<div className="grid gap-4 sm:grid-cols-2">
						<FormField label={t("storage.bucket")} htmlFor="storage-bucket"><Input id="storage-bucket" value={form.bucket} placeholder="mailflare" autoComplete="off" spellCheck={false} disabled={!data || !!busy} onChange={(event) => update({ bucket: event.target.value })} required /></FormField>
						<FormField label={t("storage.region")} htmlFor="storage-region" description={t("storage.regionHint")}><Input id="storage-region" value={form.region} placeholder={regionHint} autoComplete="off" spellCheck={false} disabled={!data || !!busy} onChange={(event) => update({ region: event.target.value })} /></FormField>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<FormField label={t("storage.accessKeyId")} htmlFor="storage-key"><Input id="storage-key" value={form.accessKeyId} autoComplete="off" spellCheck={false} disabled={!data || !!busy} onChange={(event) => update({ accessKeyId: event.target.value })} required /></FormField>
						<FormField label={t("storage.secretAccessKey")} htmlFor="storage-secret" description={savedSecret ? t("storage.secretSaved") : undefined}><Input id="storage-secret" type="password" value={form.secretAccessKey} autoComplete="new-password" disabled={!data || !!busy} onChange={(event) => update({ secretAccessKey: event.target.value })} required={!savedSecret} /></FormField>
					</div>
					<div className="flex items-start gap-3"><Switch id="storage-path-style" checked={form.pathStyle} disabled={!data || !!busy} onCheckedChange={(pathStyle) => update({ pathStyle })} /><div><Label htmlFor="storage-path-style">{t("storage.pathStyle")}</Label><p className="mt-1 text-xs text-neutral-500">{t("storage.pathStyleHint")}</p></div></div>
				</>}
				<div className="space-y-2 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-700"><p>{t("storage.switchWarning")}</p><p>{bunny ? t("storage.bunnyNote") : t("storage.corsHint", { origin: origin || "https://mail.example.com" })}</p></div>
				{formStatus && <p role="status" className={formStatus.error ? "text-sm text-red-700" : "text-sm text-neutral-700"}>{formStatus.text}</p>}
				<Button type="submit" disabled={!data || !!busy}>{busy === "save" ? t("storage.saving") : t("storage.save")}</Button>
			</Form>
		</Card>
	</div>;
}
