"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { TabsProps } from "./tabs-types";

/** Tabs from data: `items` carry their own `content`; controlled with `value`/`onValueChange` or uncontrolled. */
export function Tabs({ items, value, defaultValue, onValueChange, className, listClassName, panelClassName }: TabsProps) {
	const [internal, setInternal] = React.useState(defaultValue ?? items[0]?.value ?? "");
	const current = value ?? internal;
	const id = React.useId();
	const select = (next: string) => {
		if (value === undefined) setInternal(next);
		onValueChange?.(next);
	};
	const active = items.find((item) => item.value === current);
	return (
		<div data-slot="tabs" className={cn("flex min-w-0 flex-col gap-4", className)}>
			<div
				role="tablist"
				className={cn("flex min-w-0 gap-1 overflow-x-auto border-b border-neutral-200", listClassName)}
				onKeyDown={(event) => {
					if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
					const enabled = items.filter((item) => !item.disabled);
					const index = enabled.findIndex((item) => item.value === current);
					const next = enabled[(index + (event.key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length];
					if (!next) return;
					event.preventDefault();
					select(next.value);
					document.getElementById(`${id}-tab-${next.value}`)?.focus();
				}}
			>
				{items.map((item) => {
					const selected = item.value === current;
					return (
						<button
							key={item.value}
							id={`${id}-tab-${item.value}`}
							type="button"
							role="tab"
							aria-selected={selected}
							aria-controls={`${id}-panel-${item.value}`}
							tabIndex={selected ? 0 : -1}
							disabled={item.disabled}
							onClick={() => select(item.value)}
							className={cn(
								"-mb-px inline-flex shrink-0 cursor-pointer items-center gap-2 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:pointer-events-none disabled:opacity-50",
								selected && "border-blue-600 text-blue-700",
							)}
						>
							{item.icon}
							{item.label}
						</button>
					);
				})}
			</div>
			{active?.content !== undefined && (
				<div role="tabpanel" id={`${id}-panel-${active.value}`} aria-labelledby={`${id}-tab-${active.value}`} className={cn("min-w-0", panelClassName)}>
					{active.content}
				</div>
			)}
		</div>
	);
}
