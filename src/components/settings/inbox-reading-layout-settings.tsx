"use client";

import { useLanguage } from "@/components/language-provider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTwoColumnReading } from "@/components/messages/use-two-column-reading";

export function InboxReadingLayoutSettings() {
	const { t } = useLanguage();
	const [twoColumnReading, setTwoColumnReading] = useTwoColumnReading();

	return (
		<Label className="flex items-start gap-3 rounded-xl bg-neutral-50 p-4 font-normal leading-normal">
			<span className="flex-1">
				<span className="block text-sm font-medium text-neutral-900">{t("settings.reading.title")}</span>
				<span className="mt-1 block text-sm text-neutral-500">
					{t("settings.reading.description")}
				</span>
			</span>
			<Switch checked={twoColumnReading} onCheckedChange={setTwoColumnReading} aria-label={t("settings.reading.title")} />
		</Label>
	);
}
