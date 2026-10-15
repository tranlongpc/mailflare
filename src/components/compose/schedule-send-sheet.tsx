"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, FileText, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { useLanguage } from "@/components/language-provider";
import { authFetch } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { getUserTimeZone } from "@/lib/time/utils";
import { textToHtml } from "./rich-text-utils";
import { formatDateTimeLocal, formatScheduledSend, getScheduleSendOptions, isPastSchedule, parseDateTimeLocal } from "./schedule-send-utils";
import type { ScheduleSendSheetProps } from "./schedule-send-types";
import type { ComposeTemplate } from "./template-types";

type Page = "root" | "date" | "templates";
const PAGES: Page[] = ["root", "date", "templates"];

const pageClass = "flex max-h-[calc(85dvh-3.5rem)] w-full shrink-0 flex-col px-2 pb-3";

const rowClass = "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base text-neutral-900 active:bg-neutral-100";

/** Phone version of the Send options menu: a bottom sheet whose pages slide in (root → date, templates). */
export function ScheduleSendSheet({ open, onOpenChange, value, onChange, onApplyTemplate, onNewTemplate }: ScheduleSendSheetProps) {
	const { t } = useLanguage();
	const [page, setPage] = useState<Page>("root");
	const [templates, setTemplates] = useState<ComposeTemplate[]>([]);
	const [draftDate, setDraftDate] = useState("");
	const pageRefs = useRef<Record<Page, HTMLDivElement | null>>({ root: null, date: null, templates: null });
	const [height, setHeight] = useState<number | undefined>(undefined);

	// The sheet is as tall as the page showing, and eases between heights as pages slide.
	useEffect(() => {
		const element = pageRefs.current[page];
		if (!open || !element) return;
		const measure = () => setHeight(element.offsetHeight);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, [open, page, templates.length, value]);

	useEffect(() => {
		if (!open) return;
		setPage("root");
		setDraftDate(value ? formatDateTimeLocal(value) : "");
		void authFetch("/api/templates", { cache: "no-store" })
			.then(async (response) => {
				if (response.ok) setTemplates(((await response.json()) as { templates: ComposeTemplate[] }).templates);
			})
			.catch(() => {});
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const options = getScheduleSendOptions();
	const minimum = formatDateTimeLocal(new Date());
	const parsedDate = parseDateTimeLocal(draftDate);
	const pastDate = parsedDate !== null && isPastSchedule(parsedDate);
	const title = page === "date" ? t("schedule.pick", { timeZone: getUserTimeZone() }) : page === "templates" ? t("template.menu") : t("schedule.heading");

	function choose(date: Date | null) {
		onChange(date);
		onOpenChange(false);
	}

	return (
		<Sheet
			open={open}
			onOpenChange={onOpenChange}
			side="bottom"
			title={title}
			hideTitle
			showClose={false}
			className="max-h-[85dvh] gap-0 p-0 pb-[env(safe-area-inset-bottom)] shadow-2xl"
			backdropClassName="slide-sheet-overlay bg-black/40"
			bodyClassName="mx-0 overflow-hidden p-0"
		>
			<div className="flex h-14 items-center gap-1 px-2">
				{page === "root" ? <span className="w-10" /> : (
					<Button type="button" variant="unstyled" onClick={() => setPage("root")} className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100">
						<ChevronLeft className="h-6 w-6" />
						<span className="sr-only">{t("schedule.heading")}</span>
					</Button>
				)}
				<p aria-hidden="true" className="flex-1 truncate text-center text-base font-semibold text-neutral-900">{title}</p>
				<Button type="button" variant="unstyled" onClick={() => onOpenChange(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100">
					<X className="h-5 w-5" />
					<span className="sr-only">{t("navigation.close")}</span>
				</Button>
			</div>
			<div className="overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none" style={{ height }}>
				<div className="flex items-start transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none" style={{ transform: `translateX(-${PAGES.indexOf(page) * 100}%)` }}>
					<div ref={(node) => { pageRefs.current.root = node; }} className={pageClass} inert={page !== "root"}>
						<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
							{value && (
								<Button variant="unstyled" type="button" onClick={() => choose(null)} className={rowClass}>
									<X className="h-5 w-5 text-neutral-500" />
									{t("schedule.clear")}
								</Button>
							)}
							{options.map((option) => (
								<Button variant="unstyled" key={option.labelKey} type="button" onClick={() => choose(option.value)} className={cn(rowClass, "justify-between")}>
									<span>{t(option.labelKey)}</span>
									<span className="text-sm text-neutral-500">{option.value && formatScheduledSend(option.value)}</span>
								</Button>
							))}
						</div>
						<div className="shrink-0 pt-2">
							<Button variant="unstyled" type="button" onClick={() => setPage("date")} className={cn(rowClass, "justify-between")}>
								<span className="flex items-center gap-3"><CalendarClock className="h-5 w-5 text-neutral-500" />{t("schedule.pick", { timeZone: getUserTimeZone() })}</span>
								<ChevronRight className="h-5 w-5 text-neutral-400" />
							</Button>
							<Button variant="unstyled" type="button" onClick={() => setPage("templates")} className={cn(rowClass, "justify-between")}>
								<span className="flex items-center gap-3"><FileText className="h-5 w-5 text-neutral-500" />{t("template.menu")}</span>
								<ChevronRight className="h-5 w-5 text-neutral-400" />
							</Button>
						</div>
					</div>
					<div ref={(node) => { pageRefs.current.date = node; }} className={pageClass} inert={page !== "date"}>
						<div className="min-h-0 flex-1 overflow-y-auto px-2">
							<Input
								variant="bare"
								type="datetime-local"
								min={minimum}
								value={draftDate}
								onChange={(event) => setDraftDate(event.target.value)}
								aria-label={t("schedule.pick", { timeZone: getUserTimeZone() })}
								aria-invalid={pastDate}
								aria-describedby={pastDate ? "schedule-past-time" : undefined}
								className="h-12 w-full rounded-xl border border-neutral-200 px-3 text-base outline-none focus:border-blue-400"
							/>
							{pastDate && <p id="schedule-past-time" role="alert" className="mt-2 text-sm text-red-600">{t("schedule.pastTime")}</p>}
						</div>
						<div className="shrink-0 px-2 pt-4">
							<Button type="button" className="h-12 w-full rounded-xl text-base" disabled={!parsedDate || pastDate} onClick={() => choose(parsedDate)}>
								{t("schedule.heading")}
							</Button>
						</div>
					</div>
					<div ref={(node) => { pageRefs.current.templates = node; }} className={pageClass} inert={page !== "templates"}>
						<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
							{templates.length === 0 && <p className="px-3 py-3 text-sm text-neutral-500">{t("template.none")}</p>}
							{templates.map((template) => (
								<Button
									variant="unstyled"
									key={template.id}
									type="button"
									onClick={() => {
										onApplyTemplate({ title: template.subject ?? "", html: template.htmlBody ?? textToHtml(template.textBody ?? "") });
										onOpenChange(false);
									}}
									className={rowClass}
								>
									<span className="break-words">{template.subject || t("template.untitled")}</span>
								</Button>
							))}
						</div>
						<div className="shrink-0 pt-2">
							<Button variant="unstyled" type="button" onClick={() => { onOpenChange(false); onNewTemplate(); }} className={cn(rowClass, "text-blue-600")}>
								<Plus className="h-5 w-5" />{t("template.new")}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</Sheet>
	);
}
