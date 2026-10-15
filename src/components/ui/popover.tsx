"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useExternalAnchor, useFloatingPosition } from "./internal/floating";
import { useModalLayer } from "./internal/modal-layer";
import { Slot } from "./internal/slot";
import { useDismiss } from "./internal/use-dismiss";
import type { PopoverProps } from "./popover-types";

/** A floating panel opened by `trigger` (or positioned against `anchor`); the panel content is `children`. */
export function Popover({
	trigger,
	anchor,
	children,
	open: controlledOpen,
	defaultOpen = false,
	onOpenChange,
	align = "start",
	side = "bottom",
	offset = 6,
	modal = false,
	matchWidth = false,
	className,
	ariaLabel,
}: PopoverProps) {
	const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
	const triggerRef = React.useRef<HTMLElement>(null);
	const contentRef = React.useRef<HTMLDivElement>(null);
	const open = controlledOpen ?? internalOpen;
	const external = useExternalAnchor(anchor);
	const anchored = anchor !== undefined;
	const style = useFloatingPosition({ open, anchorRef: anchored ? external.anchorRef : triggerRef, floatingRef: contentRef, align, side, offset, matchWidth });

	const setOpen = React.useCallback(
		(next: boolean) => {
			if (controlledOpen === undefined) setInternalOpen(next);
			onOpenChange?.(next);
		},
		[controlledOpen, onOpenChange],
	);

	const restoreFocusTo = anchored ? undefined : triggerRef;
	useDismiss({ open, onDismiss: () => setOpen(false), insideRefs: [anchored ? external.elementRef : triggerRef, contentRef], restoreFocusTo, dismissOnEscape: !modal });
	useModalLayer({ open: open && modal, panelRef: contentRef, onDismiss: () => setOpen(false), restoreFocusTo });

	return (
		<>
			{trigger && (
				<Slot ref={triggerRef} aria-haspopup="dialog" aria-expanded={open} data-state={open ? "open" : "closed"} onClick={() => setOpen(!open)}>
					{trigger}
				</Slot>
			)}
			{open &&
				typeof document !== "undefined" &&
				createPortal(
					<>
						{modal && <div className="fixed inset-0 z-[190] bg-black/20" />}
						<div
							ref={contentRef}
							role="dialog"
							aria-modal={modal || undefined}
							aria-label={ariaLabel}
							style={style}
							className={cn("z-[200] max-h-[min(28rem,calc(100dvh-1rem))] min-w-48 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-900 shadow-xl outline-none", className)}
						>
							{typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
						</div>
					</>,
					document.body,
				)}
		</>
	);
}
