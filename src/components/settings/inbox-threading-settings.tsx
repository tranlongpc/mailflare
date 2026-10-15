"use client";

import { useLanguage } from "@/components/language-provider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useConversationView } from "@/components/messages/use-conversation-view";
import { useLatestMessagesFirst } from "@/components/messages/use-latest-messages-first";

export function InboxThreadingSettings() {
	const { t } = useLanguage();
	const [conversationView, setConversationView] = useConversationView();
	const [latestMessagesFirst, setLatestMessagesFirst] = useLatestMessagesFirst();

	return (
		<div className="space-y-3">
			<Label className="flex items-start gap-3 rounded-xl bg-neutral-50 p-4 font-normal leading-normal">
				<span className="flex-1">
					<span className="block text-sm font-medium text-neutral-900">{t("settings.threading.groupTitle")}</span>
					<span className="mt-1 block text-sm text-neutral-500">
						{t("settings.threading.groupDescription")}
					</span>
				</span>
				<Switch checked={conversationView} onCheckedChange={setConversationView} />
			</Label>
			<Label className="flex items-start gap-3 rounded-xl bg-neutral-50 p-4 font-normal leading-normal">
				<span className="flex-1">
					<span className="block text-sm font-medium text-neutral-900">{t("settings.threading.latestTitle")}</span>
					<span className="mt-1 block text-sm text-neutral-500">
						{t("settings.threading.latestDescription")}
					</span>
				</span>
				<Switch checked={latestMessagesFirst} onCheckedChange={setLatestMessagesFirst} />
			</Label>
		</div>
	);
}
