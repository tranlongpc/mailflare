"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { authFetch } from "@/lib/auth/client";
import { textToHtml } from "./rich-text-utils";
import type { NewTemplateDialogProps } from "./template-types";

export function NewTemplateDialog({ open, onOpenChange, mailboxId, from }: NewTemplateDialogProps) {
	const { t } = useLanguage();
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	async function save() {
		setSaving(true);
		setError("");
		try {
			const response = await authFetch("/api/templates", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ mailboxId, from, title, text: content, html: textToHtml(content) }),
			});
			if (!response.ok) {
				setError(((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? t("template.saveFailed"));
				return;
			}
			onOpenChange(false);
			setTitle("");
			setContent("");
		} catch {
			setError(t("template.saveFailed"));
		} finally {
			setSaving(false);
		}
	}

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			title={t("template.new")}
			onSubmit={(event) => { event.preventDefault(); void save(); }}
			bodyClassName="space-y-4"
			footer={
				<Button type="submit" disabled={saving || !title.trim() || !content.trim()}>
					{saving ? t("template.saving") : t("template.save")}
				</Button>
			}
		>
			<FormField label={t("template.title")} htmlFor="template-title" className="space-y-1.5">
				<Input id="template-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required />
			</FormField>
			<FormField label={t("template.content")} htmlFor="template-content" className="space-y-1.5">
				<Textarea id="template-content" value={content} onChange={(event) => setContent(event.target.value)} rows={8} required />
			</FormField>
			{error && <p role="alert" className="text-sm text-red-600">{error}</p>}
		</Dialog>
	);
}
