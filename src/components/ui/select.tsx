"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { useFloatingPosition } from "./internal/floating";
import { useDismiss } from "./internal/use-dismiss";
import { Input } from "./input";
import type { SelectOption, SelectProps } from "./select-types";

function normalize(value: string) {
	return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase();
}

function enabledIndexes(options: readonly SelectOption[]) {
	return options.map((option, index) => (option.disabled ? -1 : index)).filter((index) => index >= 0);
}

/** A data-first listbox: pass `options`, `value`, `onValueChange`. Long lists get a search box. */
export function Select({
	options: givenOptions,
	value: controlledValue,
	defaultValue = "",
	onValueChange,
	onOpenChange,
	placeholder,
	searchable,
	searchThreshold = 10,
	searchPlaceholder,
	emptyMessage,
	disabled,
	required,
	id,
	name,
	className,
	containerClassName,
	size = "default",
	variant = "default",
	align = "start",
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	"aria-describedby": ariaDescribedBy,
	"aria-invalid": ariaInvalid,
	title,
}: SelectProps) {
	const { t } = useLanguage();
	// The placeholder stays choosable, as the empty first option of a native select was.
	const options = React.useMemo<readonly SelectOption[]>(
		() => (placeholder !== undefined && !givenOptions.some((option) => option.value === "") ? [{ value: "", label: placeholder, disabled: required }, ...givenOptions] : givenOptions),
		[givenOptions, placeholder, required],
	);
	const [internalValue, setInternalValue] = React.useState(defaultValue);
	const [open, setInternalOpen] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const [activeIndex, setActiveIndex] = React.useState(-1);
	const triggerRef = React.useRef<HTMLButtonElement>(null);
	const menuRef = React.useRef<HTMLDivElement>(null);
	const searchRef = React.useRef<HTMLInputElement>(null);
	const typeaheadRef = React.useRef("");
	const typeaheadTimerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
	const listboxId = `select-${React.useId().replace(/:/g, "")}`;
	const value = controlledValue ?? internalValue;
	const hasSearch = searchable ?? options.length >= searchThreshold;
	const filteredOptions = React.useMemo(() => {
		const normalizedQuery = normalize(query.trim());
		if (!normalizedQuery) return options;
		return options.filter((option) => normalize(`${option.group ?? ""} ${option.label} ${option.searchText ?? ""}`).includes(normalizedQuery));
	}, [options, query]);
	const selected = options.find((option) => option.value === value);
	const activeOption = filteredOptions[activeIndex];
	const optionId = (option: SelectOption) => `${listboxId}-option-${options.indexOf(option)}`;
	const style = useFloatingPosition({ open, anchorRef: triggerRef, floatingRef: menuRef, align, offset: 4, matchWidth: true });

	const setOpen = React.useCallback(
		(next: boolean) => {
			setInternalOpen(next);
			onOpenChange?.(next);
			if (!next) {
				setQuery("");
				setActiveIndex(-1);
			}
		},
		[onOpenChange],
	);

	useDismiss({ open, onDismiss: () => setOpen(false), insideRefs: [triggerRef, menuRef], restoreFocusTo: triggerRef });

	const scrollToIndex = (index: number) => {
		requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>(`[data-option-index="${index}"]`)?.scrollIntoView({ block: "nearest" }));
	};

	const choose = (option: SelectOption) => {
		if (option.disabled) return;
		if (controlledValue === undefined) setInternalValue(option.value);
		if (option.value !== value) onValueChange?.(option.value);
		setOpen(false);
		requestAnimationFrame(() => triggerRef.current?.focus());
	};

	const openList = () => {
		const selectedIndex = filteredOptions.findIndex((option) => option.value === value && !option.disabled);
		const start = selectedIndex >= 0 ? selectedIndex : (enabledIndexes(filteredOptions)[0] ?? -1);
		setActiveIndex(start);
		setOpen(true);
		if (start >= 0) scrollToIndex(start);
		if (hasSearch) requestAnimationFrame(() => searchRef.current?.focus());
	};

	const move = (step: number) => {
		const indexes = enabledIndexes(filteredOptions);
		if (!indexes.length) return;
		const current = indexes.indexOf(activeIndex);
		const next = indexes[(current + step + indexes.length) % indexes.length];
		setActiveIndex(next);
		scrollToIndex(next);
	};

	React.useEffect(() => () => clearTimeout(typeaheadTimerRef.current), []);

	const handleTypeahead = (key: string) => {
		clearTimeout(typeaheadTimerRef.current);
		const previous = typeaheadRef.current;
		const repeated = previous.length > 0 && [...previous].every((character) => character === key);
		const buffer = `${previous}${key}`;
		typeaheadRef.current = buffer;
		typeaheadTimerRef.current = setTimeout(() => {
			typeaheadRef.current = "";
		}, 500);
		const search = normalize(repeated ? key : buffer);
		const indexes = enabledIndexes(filteredOptions);
		const position = Math.max(indexes.indexOf(activeIndex), -1);
		const ordered = [...indexes.slice(position + 1), ...indexes.slice(0, position + 1)];
		const next = ordered.find((index) => normalize(filteredOptions[index]?.label ?? "").startsWith(search));
		if (next === undefined) return;
		if (open) {
			setActiveIndex(next);
			scrollToIndex(next);
		} else {
			// Closed: typing picks the match directly, like a native select.
			const option = filteredOptions[next];
			if (option && option.value !== value) {
				if (controlledValue === undefined) setInternalValue(option.value);
				onValueChange?.(option.value);
			}
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Tab") {
			setOpen(false);
			return;
		}
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			if (!open) openList();
			else move(event.key === "ArrowDown" ? 1 : -1);
			return;
		}
		if ((event.key === "Home" || event.key === "End") && open) {
			const indexes = enabledIndexes(filteredOptions);
			const next = event.key === "Home" ? indexes[0] : indexes[indexes.length - 1];
			if (next === undefined) return;
			event.preventDefault();
			setActiveIndex(next);
			scrollToIndex(next);
			return;
		}
		if (event.key === "Enter" || (event.key === " " && document.activeElement !== searchRef.current)) {
			event.preventDefault();
			if (!open) openList();
			else if (activeOption) choose(activeOption);
			return;
		}
		if (!hasSearch && event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
			event.preventDefault();
			handleTypeahead(normalize(event.key));
		}
	};

	const label = selected?.label ?? placeholder ?? "";

	return (
		<span
			data-slot="select"
			className={cn(
				"relative inline-flex min-w-0 items-center",
				variant === "default" && "rounded-lg border border-neutral-200 bg-white focus-within:border-blue-600",
				variant === "default" && (size === "sm" ? "h-8" : "h-10"),
				containerClassName,
			)}
		>
			{(name || required) && (
				// Carries the value into form submission and native `required` validation; focusing it hands focus to the trigger.
				<input
					tabIndex={-1}
					aria-hidden="true"
					name={name}
					required={required}
					value={value}
					onChange={() => undefined}
					onFocus={() => triggerRef.current?.focus()}
					className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
				/>
			)}
			<button
				ref={triggerRef}
				id={id}
				type="button"
				role="combobox"
				disabled={disabled}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledBy}
				aria-describedby={ariaDescribedBy}
				aria-invalid={ariaInvalid}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? listboxId : undefined}
				aria-activedescendant={open && !hasSearch && activeOption ? optionId(activeOption) : undefined}
				data-state={open ? "open" : "closed"}
				title={title ?? label}
				className={cn(
					"flex h-full w-full min-w-0 cursor-pointer items-center gap-2 bg-transparent text-left text-sm text-neutral-900 outline-none disabled:cursor-not-allowed disabled:opacity-50",
					variant === "default" ? "pl-3 pr-2.5" : "pr-1",
					!selected?.value && placeholder !== undefined && "text-neutral-500",
					className,
				)}
				onClick={() => (open ? setOpen(false) : openList())}
				onKeyDown={handleKeyDown}
			>
				<span className="min-w-0 flex-1 truncate" lang={selected?.lang}>
					{label}
				</span>
				<ChevronDown aria-hidden="true" className={cn("h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-100", open && "rotate-180")} />
			</button>
			{open &&
				typeof document !== "undefined" &&
				createPortal(
					<div
						ref={menuRef}
						style={style}
						className="z-[200] flex max-h-80 w-max max-w-[min(32rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 text-neutral-900 shadow-xl outline-none"
						onKeyDown={handleKeyDown}
					>
						{hasSearch && (
							<div className="relative shrink-0 pb-1.5">
								<Search className="pointer-events-none absolute left-2.5 top-4 h-4 w-4 -translate-y-1/2 text-neutral-500" />
								<Input
									ref={searchRef}
									type="search"
									role="combobox"
									value={query}
									onChange={(event) => {
										setQuery(event.target.value);
										setActiveIndex(0);
									}}
									placeholder={searchPlaceholder ?? t("common.search")}
									aria-label={searchPlaceholder ?? t("common.search")}
									aria-expanded={open}
									aria-controls={listboxId}
									aria-activedescendant={activeOption ? optionId(activeOption) : undefined}
									aria-autocomplete="list"
									className="h-8 pl-8 shadow-none"
								/>
							</div>
						)}
						<div id={listboxId} role="listbox" aria-label={ariaLabel} className="flex min-h-0 flex-col gap-0.5 overflow-y-auto overscroll-contain">
							{filteredOptions.map((option, index) => {
								const isSelected = option.value === value;
								return (
									<React.Fragment key={option.value}>
										{option.group && (index === 0 || filteredOptions[index - 1]?.group !== option.group) && (
											<div className="px-3 pb-1 pt-2 text-xs font-medium text-neutral-500">{option.group}</div>
										)}
										<div
											role="option"
											id={optionId(option)}
											aria-selected={isSelected}
											aria-disabled={option.disabled || undefined}
											data-option-index={index}
											lang={option.lang}
											className={cn(
												"flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm",
												index === activeIndex && "bg-neutral-100",
												isSelected && "font-medium text-blue-700",
												option.disabled && "pointer-events-none opacity-50",
											)}
											onMouseEnter={() => setActiveIndex(index)}
											onMouseDown={(event) => event.preventDefault()}
											onClick={() => choose(option)}
										>
											<span className="min-w-0 truncate">{option.label}</span>
											<span className="flex shrink-0 items-center gap-2">
												{option.hint && <span className="text-xs tabular-nums text-neutral-500">{option.hint}</span>}
												{isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
											</span>
										</div>
									</React.Fragment>
								);
							})}
							{filteredOptions.length === 0 && <p className="px-3 py-5 text-center text-sm text-neutral-500">{emptyMessage ?? t("common.noResults")}</p>}
						</div>
					</div>,
					document.body,
				)}
		</span>
	);
}
