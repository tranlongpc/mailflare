"use client";

import { Archive, ArchiveRestore, ChevronDown, Folder, FolderInput, Inbox, Mail, MailOpen, MoreVertical, ShieldAlert, ShieldCheck, Trash2, Undo2, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import type { DropdownItem } from "@/components/ui/dropdown-menu-types";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { useMailboxFolders } from "./use-mailbox-folders";
import { Tooltip } from "@/components/ui/tooltip";
import { supportsPermanentDelete } from "@/lib/messages/permanent-delete-utils";
import type { BulkMessageAction } from "@/app/api/messages/bulk/types";
import type { BulkMessageToolbarProps } from "./types";

export function BulkMessageToolbar({
	selectedCount,
	hasUnreadSelection,
	hideSelectedCount = false,
	onAction,
	onClearSelection,
	pending,
	folder,
}: BulkMessageToolbarProps) {
	const { t } = useLanguage();
	// In archived, spam and trash the usual button would be a no-op, so it becomes the way back to the inbox.
	const archive = folder === "archived"
		? { action: "inbox", label: t("common.unarchive"), Icon: ArchiveRestore }
		: { action: "archive", label: t("common.archive"), Icon: Archive };
	const spam = folder === "spam"
		? { action: "inbox", label: t("common.notSpam"), Icon: ShieldCheck }
		: { action: "spam", label: t("common.reportSpam"), Icon: ShieldAlert };
	const trash = folder === "trash"
		? { action: "inbox", label: t("common.restore"), Icon: Undo2 }
		: { action: "trash", label: t("common.delete"), Icon: Trash2 };
	// Trash and Spam also offer the irreversible delete; the page confirms before running it.
	const canDeleteForever = supportsPermanentDelete(folder);
	const moveOptions = [
		{ value: "inbox", label: t("navigation.inbox"), Icon: Inbox, hidden: folder === "inbox" },
		{ value: "archive", label: t("navigation.archived"), Icon: Archive, hidden: folder === "archived" },
		{ value: "spam", label: t("navigation.spam"), Icon: ShieldAlert, hidden: folder === "spam" },
		{ value: "trash", label: t("navigation.trash"), Icon: Trash2, hidden: folder === "trash" },
	].filter((option) => !option.hidden);
	const { selectedMailbox } = useSelectedMailbox();
	const folders = useMailboxFolders(selectedMailbox?.id);
	const moveItems: DropdownItem[] = [
		...moveOptions.map(({ value, label, Icon }) => ({ key: value, label, icon: <Icon className="h-4 w-4" />, onSelect: () => onAction(value as BulkMessageAction) })),
		...(folders.length > 0
			? [
				{ kind: "label" as const, key: "folders", label: t("navigation.folders"), separatorBefore: true },
				...folders.map((item) => ({
					key: item.id,
					label: item.name,
					icon: <Folder className="h-4 w-4 shrink-0" style={{ color: item.color }} />,
					onSelect: () => onAction("folder", item.id),
				})),
			]
			: []),
	];
	const mobileItems: DropdownItem[] = [
		{ key: "archive", label: archive.label, icon: <archive.Icon className="h-4 w-4" />, onSelect: () => onAction(archive.action as BulkMessageAction) },
		{ key: "spam", label: spam.label, icon: <spam.Icon className="h-4 w-4" />, onSelect: () => onAction(spam.action as BulkMessageAction) },
		...(canDeleteForever ? [{ key: "deleteForever", label: t("common.deleteForever"), icon: <Trash2 className="h-4 w-4" />, destructive: true, onSelect: () => onAction("delete") }] : []),
		{ key: "clear", label: t("common.clearSelection"), icon: <X className="h-4 w-4" />, separatorBefore: true, onSelect: onClearSelection },
	];
	return (
		<div className="flex min-w-0 items-center gap-2 text-neutral-600 w-full">
			{!hideSelectedCount && (
				<span className="mr-2 text-sm font-medium text-neutral-800">
					{t("common.selectedCount", { count: selectedCount })}
				</span>
			)}
			<span className="flex-1 md:hidden" />
			<Tooltip label={archive.label} className="max-md:hidden">
				<Button variant="ghost" size="sm" onClick={() => onAction(archive.action as BulkMessageAction)} disabled={pending} aria-label={archive.label}>
					<archive.Icon className="h-4 w-4" />
				</Button>
			</Tooltip>
			<Tooltip label={spam.label} className="max-md:hidden">
				<Button variant="ghost" size="sm" onClick={() => onAction(spam.action as BulkMessageAction)} disabled={pending} aria-label={spam.label}>
					<spam.Icon className="h-4 w-4" />
				</Button>
			</Tooltip>
			<Tooltip label={trash.label}>
				<Button variant="ghost" size="sm" onClick={() => onAction(trash.action as BulkMessageAction)} disabled={pending} aria-label={trash.label}>
					<trash.Icon className="h-4 w-4" />
				</Button>
			</Tooltip>
			{canDeleteForever && (
				<Tooltip label={t("common.deleteForever")}>
					<Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onAction("delete")} disabled={pending} aria-label={t("common.deleteForever")}>
						<Trash2 className="h-4 w-4" />
					</Button>
				</Tooltip>
			)}
			<Tooltip label={hasUnreadSelection ? t("common.markRead") : t("common.markUnread")}>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onAction(hasUnreadSelection ? "read" : "unread")}
					disabled={pending}
					aria-label={hasUnreadSelection ? t("common.markRead") : t("common.markUnread")}
				>
					{hasUnreadSelection ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
				</Button>
			</Tooltip>
			<span className="flex-1 max-md:hidden" />
			<Tooltip label={t("common.moveSelected")} className="max-md:hidden">
				<DropdownMenu
					align="end"
					offset={4}
					className="w-54"
					items={moveItems}
					trigger={
						<Button variant="ghost" size="sm" className="max-md:hidden gap-1.5 bg-white text-xs font-medium text-neutral-700" disabled={pending}>
							<FolderInput className="h-4 w-4" />
							{t("common.moveTo")}
							<ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
						</Button>
					}
				/>
			</Tooltip>
			<Tooltip label={t("common.clearSelection")} className="max-md:hidden">
				<Button variant="ghost" size="sm" onClick={onClearSelection} disabled={pending} aria-label={t("common.clearSelection")}>
					<X className="h-4 w-4" />
				</Button>
			</Tooltip>
			<DropdownMenu
				align="end"
				offset={4}
				className="min-w-44 p-1 md:hidden"
				items={mobileItems}
				trigger={
					<Button variant="ghost" size="sm" className="md:hidden" disabled={pending} aria-label={t("common.moreActions")}>
						<MoreVertical className="h-4 w-4" />
					</Button>
				}
			/>
		</div>
	);
}
