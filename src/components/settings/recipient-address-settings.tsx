"use client";

import { useState } from "react";
import { useShowFullRecipientAddresses } from "@/components/messages/use-show-full-recipient-addresses";
import { useLanguage } from "@/components/language-provider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function RecipientAddressSettings() {
	const { t } = useLanguage();
	const { enabled, error, isLoading, setEnabled } = useShowFullRecipientAddresses();
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);

	return (
		<div>
			<Label className="flex items-start gap-3 rounded-xl bg-neutral-50 p-4 font-normal leading-normal">
				<span className="flex-1">
					<span className="block text-sm font-medium text-neutral-900">{t("settings.recipient.title")}</span>
					<span className="mt-1 block text-sm text-neutral-500">
						{t("settings.recipient.description")}
					</span>
				</span>
				<Switch
					checked={enabled}
					disabled={isLoading || saving}
					onCheckedChange={(next) => {
						setSaving(true);
						setSaveError(null);
						void setEnabled(next)
							.catch((updateError) => setSaveError(updateError instanceof Error ? updateError.message : t("settings.recipient.failed")))
							.finally(() => setSaving(false));
					}}
					aria-label={t("settings.recipient.title")}
				/>
			</Label>
			{(saveError || error) && <p role="alert" className="mt-2 px-4 text-sm text-red-600">{saveError || error}</p>}
		</div>
	);
}
