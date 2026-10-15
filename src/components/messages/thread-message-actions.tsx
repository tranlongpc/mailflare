"use client";

import { createElement, useEffect, useState } from "react";
import { Ban, FileCode2, Forward, Mail, MailOpen, MoreVertical, Reply, ReplyAll, Star } from "lucide-react";
import { useCompose } from "@/components/compose/compose-context";
import { MessageSourceDialog } from "@/components/messages/message-source-dialog";
import { getOwnAddressForMessage } from "@/app/(dashboard)/inbox/[messageId]/utils";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import type { DropdownItem } from "@/components/ui/dropdown-menu-types";
import { Tooltip } from "@/components/ui/tooltip";
import {
	blockMessageContact,
	createForwardDraft,
	createReplyDraft,
	getMoveMessageActions,
	getReplyRecipients,
	getReplyThreading,
	hasAdditionalRecipients,
	runSingleMessageAction,
} from "@/components/message-actions/utils";
import { toggleMessageStar } from "./message-list-row-actions-utils";
import type { ThreadMessageActionsProps } from "./thread-message-actions-types";
import type { ReplyMode } from "@/components/message-actions/types";

export function ThreadMessageActions({
	message,
	mailboxId,
	ownAddress,
	ownAddresses = [],
	starOnly = false,
}: ThreadMessageActionsProps) {
	const { t } = useLanguage();
	const { openDraftComposer } = useCompose();
	const [starred, setStarred] = useState(message.starred);
	const [moreOpen, setMoreOpen] = useState(false);
	const [sourceOpen, setSourceOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const canReplyAll = hasAdditionalRecipients(message, ownAddresses);
	const moveActions = getMoveMessageActions(message.status, message.direction);
	const replyFromAddress = ownAddresses.length > 0
		? getOwnAddressForMessage(message, ownAddresses)
		: ownAddress;

	useEffect(() => setStarred(message.starred), [message.starred]);
	useEffect(() => {
		if (starOnly) setMoreOpen(false);
	}, [starOnly]);

	async function onToggleStar() {
		setPending(true);
		setError(null);
		try {
			setStarred((await toggleMessageStar(message.id)).starred);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : t("message.error.star"));
		} finally {
			setPending(false);
		}
	}

	async function onReply(mode: ReplyMode) {
		setMoreOpen(false);
		setPending(true);
		setError(null);
		try {
			const draftId = await createReplyDraft({
				mailboxId,
				senderAddress: message.fromAddr,
				ownAddress: replyFromAddress,
				subject: message.subject,
				bodyText: message.textBody,
				bodyHtml: message.htmlBody,
				sentAt: message.createdAt,
				recipients: getReplyRecipients(message, ownAddresses, mode),
				threading: getReplyThreading(message),
			});
			openDraftComposer(draftId);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : t("message.error.reply"));
		} finally {
			setPending(false);
		}
	}

	async function onForward() {
		setMoreOpen(false);
		setPending(true);
		setError(null);
		try {
			const draftId = await createForwardDraft({
				mailboxId,
				ownAddress: replyFromAddress,
				message,
				bodyText: message.textBody,
				bodyHtml: message.htmlBody,
			});
			openDraftComposer(draftId);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : t("message.error.forward"));
		} finally {
			setPending(false);
		}
	}

	async function onMessageAction(action: Parameters<typeof runSingleMessageAction>[1]) {
		setMoreOpen(false);
		setPending(true);
		setError(null);
		try {
			await runSingleMessageAction(message.id, action);
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : t("message.error.update"));
		} finally {
			setPending(false);
		}
	}

	async function onBlock() {
		if (!mailboxId) return;
		setMoreOpen(false);
		setPending(true);
		setError(null);
		try {
			await blockMessageContact({ mailboxId, senderAddress: message.fromAddr });
			await runSingleMessageAction(message.id, "trash");
		} catch (nextError) {
			setError(nextError instanceof Error ? nextError.message : t("message.error.block"));
		} finally {
			setPending(false);
		}
	}

	const moreItems: DropdownItem[] = [
		{ key: "reply", label: t("message.reply"), icon: <Reply className="h-4 w-4" />, onSelect: () => void onReply("reply") },
		...(canReplyAll ? [{ key: "replyAll", label: t("message.replyAll"), icon: <ReplyAll className="h-4 w-4" />, onSelect: () => void onReply("replyAll") }] : []),
		{ key: "forward", label: t("message.forward"), icon: <Forward className="h-4 w-4" />, onSelect: () => void onForward() },
		{ key: "source", label: t("message.showOriginal"), icon: <FileCode2 className="h-4 w-4" />, onSelect: () => { setMoreOpen(false); setSourceOpen(true); } },
		{
			key: "mark",
			label: message.read ? t("common.markUnread") : t("common.markRead"),
			icon: message.read ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />,
			separatorBefore: true,
			onSelect: () => void onMessageAction(message.read ? "unread" : "read"),
		},
		...moveActions.map((item) => ({ key: item.action, label: t(item.labelKey), icon: createElement(item.icon, { size: 16 }), onSelect: () => void onMessageAction(item.action) })),
		...(message.direction === "inbound" && mailboxId
			? [{ key: "block", label: t("message.blockContact"), icon: <Ban className="h-4 w-4" />, separatorBefore: true, onSelect: () => void onBlock() }]
			: []),
	];

	return (
		<div className="flex items-center gap-0.5">
			{error && <span role="alert" className="mr-1 max-w-32 truncate text-xs text-red-600" title={error}>{error}</span>}
			<Tooltip label={starred ? t("message.removeStar") : t("message.star")}>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 w-8 px-0"
					aria-label={starred ? t("message.removeStar") : t("message.star")}
					aria-pressed={starred}
					disabled={pending}
					onClick={() => void onToggleStar()}
				>
					<Star className={starred ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4"} />
				</Button>
			</Tooltip>
			{!starOnly && (
				<>
			<Tooltip label={t("message.reply")}>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-8 w-8 px-0"
					aria-label={t("message.reply")}
					disabled={pending}
					onClick={() => void onReply("reply")}
				>
					<Reply className="h-4 w-4" />
				</Button>
			</Tooltip>
			<Tooltip label={t("common.moreActions")}>
				<DropdownMenu
					open={moreOpen}
					onOpenChange={setMoreOpen}
					align="end"
					offset={4}
					className="w-56"
					items={moreItems}
					trigger={
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-8 w-8 px-0"
							aria-label={t("common.moreActions")}
							disabled={pending}
						>
							<MoreVertical className="h-4 w-4" />
						</Button>
					}
				/>
			</Tooltip>
			<MessageSourceDialog messageId={message.id} open={sourceOpen} onOpenChange={setSourceOpen} />
				</>
			)}
		</div>
	);
}
