"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileAvatarForm } from "./profile-avatar-form";
import { getMailboxAddress, updateCurrentMailboxName } from "./utils";

export function CurrentMailboxForm() {
	const { t } = useLanguage();
	const { selectedMailbox, setSelectedMailbox, isLoading } = useSelectedMailbox();
	const [displayName, setDisplayName] = useState("");
	const [savedDisplayName, setSavedDisplayName] = useState("");
	const [status, setStatus] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		const nextName = selectedMailbox?.displayName ?? "";
		setDisplayName(nextName);
		setSavedDisplayName(nextName);
		setStatus(null);
	}, [selectedMailbox?.id, selectedMailbox?.displayName]);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!selectedMailbox) return;

		setSaving(true);
		setStatus(null);
		try {
			const updated = await updateCurrentMailboxName(selectedMailbox.id, displayName);
			setSelectedMailbox(updated);
			setSavedDisplayName(updated.displayName ?? "");
			setDisplayName(updated.displayName ?? "");
			setStatus(t("common.saved"));
		} catch (err) {
			setStatus(err instanceof Error ? err.message : t("settings.mailbox.updateFailed"));
		} finally {
			setSaving(false);
		}
	}

	if (isLoading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-32" />
				<Card contentClassName="space-y-4 p-6">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-9 w-28" />
				</Card>
			</div>
		);
	}

	if (!selectedMailbox) {
		return (
			<div className="space-y-6">
				<PageHeader title={t("settings.mailbox.title")} />
				<Card contentClassName="p-6 text-sm text-neutral-500">
					{t("settings.mailbox.selectToView")}
				</Card>
			</div>
		);
	}

	const address = getMailboxAddress(selectedMailbox);
	const hasChanges = displayName.trim() !== savedDisplayName;

	return (
		<div className="space-y-8">
			<PageHeader title={t("settings.mailbox.title")} description={address} />

				<Card contentClassName="space-y-6">
					<ProfileAvatarForm
						mailboxId={selectedMailbox.id}
						initialHasAvatar={!!selectedMailbox.hasAvatar}
						name={selectedMailbox.displayName || selectedMailbox.localPart}
						colorSeed={address}
					/>
					<Form onSubmit={onSubmit}>
						<FormField label={t("common.name")} htmlFor="displayName">
							<Input
								id="displayName"
								value={displayName}
								onChange={(event) => setDisplayName(event.target.value)}
								placeholder={selectedMailbox.localPart}
								disabled={saving}
							/>
						</FormField>
						<div className="flex items-center gap-3">
							<Button type="submit" disabled={saving || !hasChanges}>
								<Save className="h-4 w-4" />
								{saving ? t("common.saving") : t("settings.mailbox.saveChanges")}
							</Button>
							{status && <p role="status" className="text-sm text-neutral-500">{status}</p>}
						</div>
					</Form>
				</Card>
		</div>
	);
}
