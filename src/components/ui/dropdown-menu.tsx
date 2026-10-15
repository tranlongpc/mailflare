"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { useExternalAnchor, useFloatingPosition } from "./internal/floating";
import { Slot } from "./internal/slot";
import { useDismiss } from "./internal/use-dismiss";
import { Input } from "./input";
import type { DropdownAction, DropdownGroup, DropdownItem, DropdownLabel, DropdownMenuProps } from "./dropdown-menu-types";

const ITEM_SELECTOR = '[role^="menuitem"]:not([disabled])';

function isGroup(item: DropdownItem): item is DropdownGroup {
	return "items" in item && Array.isArray(item.items);
}

function isLabel(item: DropdownItem): item is DropdownLabel {
	return "kind" in item && item.kind === "label";
}

function normalize(value: string) {
	return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase();
}

/** A menu built from data. `items` are actions, checkable actions, labels or nested groups. */
export function DropdownMenu({
	trigger,
	anchor,
	open: controlledOpen,
	items,
	header,
	footer,
	align = "start",
	side = "bottom",
	offset = 6,
	searchable = false,
	searchPlaceholder,
	emptyMessage,
	className,
	onOpenChange,
}: DropdownMenuProps) {
	const { t } = useLanguage();
	const [internalOpen, setInternalOpen] = React.useState(false);
	const open = controlledOpen ?? internalOpen;
	const external = useExternalAnchor(anchor);
	const anchored = anchor !== undefined;
	const [query, setQuery] = React.useState("");
	const [openGroupKey, setOpenGroupKey] = React.useState<string | null>(null);
	const triggerRef = React.useRef<HTMLElement>(null);
	const menuRef = React.useRef<HTMLDivElement>(null);
	const searchRef = React.useRef<HTMLInputElement>(null);

	const openGroup = openGroupKey ? (items.find((item) => item.key === openGroupKey) ?? null) : null;
	const level: readonly DropdownItem[] = openGroup && isGroup(openGroup) ? openGroup.items : items;
	const filteredItems = React.useMemo(() => {
		const value = normalize(query.trim());
		if (!value) return level;
		return level.filter((item) => {
			if (isLabel(item)) return false;
			const text = item.searchText ?? (typeof item.label === "string" ? item.label : "");
			return normalize(text).includes(value);
		});
	}, [level, query]);
	const style = useFloatingPosition({ open, anchorRef: anchored ? external.anchorRef : triggerRef, floatingRef: menuRef, align, side, offset });

	const setOpen = React.useCallback(
		(next: boolean) => {
			setInternalOpen(next);
			onOpenChange?.(next);
			if (!next) {
				setQuery("");
				setOpenGroupKey(null);
			}
		},
		[onOpenChange],
	);

	useDismiss({ open, onDismiss: () => setOpen(false), insideRefs: [anchored ? external.elementRef : triggerRef, menuRef], restoreFocusTo: anchored ? undefined : triggerRef });

	React.useEffect(() => {
		if (!open) return;
		const frame = requestAnimationFrame(() => {
			if (searchable) searchRef.current?.focus();
			else menuRef.current?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus();
		});
		return () => cancelAnimationFrame(frame);
	}, [searchable, open, openGroupKey]);

	function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
		if (event.key === "Tab") {
			setOpen(false);
			return;
		}
		if (event.key === "ArrowLeft" && openGroup) {
			event.preventDefault();
			setOpenGroupKey(null);
			return;
		}
		if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
		const rows = Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
		if (!rows.length) return;
		const current = rows.indexOf(document.activeElement as HTMLElement);
		const next =
			event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1 : event.key === "ArrowDown" ? (current + 1) % rows.length : (current - 1 + rows.length) % rows.length;
		event.preventDefault();
		rows[next]?.focus();
	}

	function select(item: DropdownAction) {
		item.onSelect();
		if (!item.keepOpen) setOpen(false);
	}

	const rowClassName =
		"flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-neutral-800 outline-none hover:bg-neutral-100 focus-visible:bg-neutral-100 disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0";

	return (
		<>
			{trigger && (
				<Slot
					ref={triggerRef}
					aria-haspopup="menu"
					aria-expanded={open}
					data-state={open ? "open" : "closed"}
					onClick={() => setOpen(!open)}
					onKeyDown={(event: React.KeyboardEvent) => {
						if (event.key === "ArrowDown") {
							event.preventDefault();
							setOpen(true);
						}
					}}
				>
					{trigger}
				</Slot>
			)}
			{open &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={menuRef}
						role="menu"
						style={style}
						className={cn("z-[200] flex max-h-[min(24rem,calc(100dvh-1rem))] min-w-52 max-w-[calc(100vw-1rem)] flex-col gap-1 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 text-neutral-900 shadow-xl outline-none", className)}
						onKeyDown={handleMenuKeyDown}
					>
						{header && !openGroup && <div className="shrink-0">{header}</div>}
						{openGroup && (
							<button type="button" role="menuitem" className={cn(rowClassName, "shrink-0 border-b border-neutral-100 font-medium")} onClick={() => setOpenGroupKey(null)}>
								<ChevronLeft />
								<span className="min-w-0 flex-1 truncate">{openGroup.label}</span>
								<span className="sr-only">{t("navigation.back")}</span>
							</button>
						)}
						{searchable && (
							<div className="relative shrink-0 border-b border-neutral-100 pb-1.5">
								<Search className="pointer-events-none absolute left-2.5 top-4 h-4 w-4 -translate-y-1/2 text-neutral-500" />
								<Input
									ref={searchRef}
									type="search"
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									placeholder={searchPlaceholder ?? t("common.search")}
									aria-label={searchPlaceholder ?? t("common.search")}
									className="h-8 pl-8 shadow-none"
								/>
							</div>
						)}
						<div className="flex min-h-0 flex-col gap-0.5 overflow-y-auto">
							{filteredItems.map((item) => (
								<React.Fragment key={item.key}>
									{item.separatorBefore && <div role="separator" className="my-1 h-px shrink-0 bg-neutral-100" />}
									{isLabel(item) ? (
										<div className="px-3 pb-1 pt-2 text-xs font-medium text-neutral-500">{item.label}</div>
									) : (
										<button
											type="button"
											role={!isGroup(item) && item.checked !== undefined ? "menuitemcheckbox" : "menuitem"}
											aria-checked={!isGroup(item) && item.checked !== undefined ? item.checked : undefined}
											disabled={item.disabled}
											aria-haspopup={isGroup(item) ? "menu" : undefined}
											className={cn(rowClassName, item.destructive && "text-red-600 hover:bg-red-50 focus-visible:bg-red-50", item.className)}
											onClick={() => {
												if (isGroup(item)) {
													setOpenGroupKey(item.key);
													setQuery("");
													return;
												}
												select(item);
											}}
										>
											{item.icon}
											<span className="min-w-0 flex-1">
												<span className="block truncate">{item.label}</span>
												{item.description && <span className="block truncate text-xs text-neutral-500">{item.description}</span>}
											</span>
											{item.shortcut && <kbd className="ml-3 shrink-0 font-sans text-xs text-neutral-500">{item.shortcut}</kbd>}
											{!isGroup(item) && item.checked && <Check className="text-blue-600" />}
											{isGroup(item) && <ChevronRight className="text-neutral-500" />}
										</button>
									)}
								</React.Fragment>
							))}
							{filteredItems.length === 0 && <p className="px-3 py-5 text-center text-sm text-neutral-500">{emptyMessage ?? t("common.noResults")}</p>}
						</div>
						{footer && !openGroup && <div className="shrink-0 border-t border-neutral-100 pt-1.5">{footer}</div>}
					</div>,
					document.body,
				)}
		</>
	);
}
