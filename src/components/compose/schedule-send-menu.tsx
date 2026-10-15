"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import type { DropdownItem } from "@/components/ui/dropdown-menu-types";
import { Input } from "@/components/ui/input";
import { NewTemplateDialog } from "./new-template-dialog";
import { TemplateMenu } from "./template-menu";
import {
	formatDateTimeLocal,
	formatScheduledSend,
	getScheduleSendOptions,
	isPastSchedule,
	parseDateTimeLocal,
} from "./schedule-send-utils";
import type { ScheduleSendMenuProps } from "./schedule-send-types";
import { useIsMobile } from "@/components/sidebar-mobile-utils";
import { ScheduleSendSheet } from "./schedule-send-sheet";
import { getUserTimeZone } from "@/lib/time/utils";

export function ScheduleSendMenu({ disabled, value, onChange, mailboxId, from, onApplyTemplate }: ScheduleSendMenuProps) {
	const { t } = useLanguage();
	const [newTemplateOpen, setNewTemplateOpen] = useState(false);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const isPhone = useIsMobile();
	const [pickedText, setPickedText] = useState<string | null>(null);
	const options = getScheduleSendOptions();
	const picked = pickedText === null ? null : parseDateTimeLocal(pickedText);
	const pastPicked = picked !== null && isPastSchedule(picked);

	function pick(text: string) {
		const parsed = parseDateTimeLocal(text);
		setPickedText(text);
		if (!parsed) onChange(null);
		else if (!isPastSchedule(parsed)) onChange(parsed);
	}

	if (isPhone) {
		return (
			<>
				<Button type="button" variant="unstyled" disabled={disabled} aria-label={t("schedule.optionsLabel")} onClick={() => setSheetOpen(true)} className="inline-flex h-8 items-center justify-center rounded-r-lg border-l border-blue-500 bg-blue-600 px-2 text-white max-md:h-10 max-md:px-2.5 transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
					<ChevronDown className="h-4 w-4" />
				</Button>
				<ScheduleSendSheet open={sheetOpen} onOpenChange={setSheetOpen} value={value} onChange={onChange} onApplyTemplate={onApplyTemplate} onNewTemplate={() => setNewTemplateOpen(true)} />
				<NewTemplateDialog open={newTemplateOpen} onOpenChange={setNewTemplateOpen} mailboxId={mailboxId} from={from} />
			</>
		);
	}

	const triggerClass = "inline-flex h-8 items-center justify-center rounded-r-lg border-l border-blue-500 bg-blue-600 px-2 text-white max-md:h-10 max-md:px-2.5 transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
	const items: DropdownItem[] = [
		{ kind: "label", key: "schedule-heading", label: t("schedule.heading"), separatorBefore: true },
		...(value ? [{ key: "clear", label: t("schedule.clear"), icon: <X className="h-4 w-4" />, onSelect: () => onChange(null) }] : []),
		...options.map((option, index) => ({
			key: option.labelKey,
			separatorBefore: Boolean(value) && index === 0,
			label: (
				<>
					{t(option.labelKey)}
					<span className="ml-2 text-xs text-neutral-500">{option.value && formatScheduledSend(option.value)}</span>
				</>
			),
			searchText: t(option.labelKey),
			onSelect: () => onChange(option.value),
		})),
	];

	return (
		<>
		<DropdownMenu
			open={menuOpen}
			onOpenChange={(next) => { setMenuOpen(next); setPickedText(null); }}
			align="start"
			offset={6}
			className="min-w-56 text-sm"
			trigger={
				<Button type="button" variant="unstyled" disabled={disabled} aria-label={t("schedule.optionsLabel")} className={triggerClass}>
					<ChevronDown className="h-4 w-4" />
				</Button>
			}
			header={<TemplateMenu onApply={(template) => { setMenuOpen(false); onApplyTemplate(template); }} onNew={() => { setMenuOpen(false); setNewTemplateOpen(true); }} />}
			items={items}
			footer={
				<>
					<p className="px-3 pb-1 pt-2 text-xs font-medium text-neutral-500">
						{t("schedule.pick", { timeZone: getUserTimeZone() })}
					</p>
					<Input
						variant="bare"
						type="datetime-local"
						min={formatDateTimeLocal(new Date())}
						value={pickedText ?? (value ? formatDateTimeLocal(value) : "")}
						onChange={(event) => pick(event.target.value)}
						onKeyDown={(event) => event.stopPropagation()}
						aria-label={t("schedule.pick", { timeZone: getUserTimeZone() })}
						aria-invalid={pastPicked}
						aria-describedby={pastPicked ? "schedule-past-time" : undefined}
						className="mx-2 mb-2 h-9 rounded-md border border-neutral-200 px-2 text-sm outline-none focus:border-blue-400"
					/>
					{pastPicked && <p id="schedule-past-time" role="alert" className="mx-2 mb-2 text-xs text-red-600">{t("schedule.pastTime")}</p>}
				</>
			}
		/>
		<NewTemplateDialog open={newTemplateOpen} onOpenChange={setNewTemplateOpen} mailboxId={mailboxId} from={from} />
		</>
	);
}
