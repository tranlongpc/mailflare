"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { TriangleAlert, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { useModalLayer } from "./modal-layer";
import type { OverlayProps } from "./overlay-types";

/** The shared modal surface behind Dialog and Sheet: portal, backdrop, focus trap, header, scrolling body, footer. */
export function Overlay({
	open,
	onOpenChange,
	title,
	hideTitle = false,
	danger = false,
	headerActions,
	description,
	children,
	footer,
	onSubmit,
	closeLabel,
	closeOnBackdrop = true,
	showClose = true,
	initialFocusRef,
	backdropClassName,
	panelClassName,
	bodyClassName,
	headerClassName,
	closeClassName,
	footerClassName,
	panelProps,
}: OverlayProps) {
	const { t } = useLanguage();
	const panelRef = React.useRef<HTMLDivElement>(null);
	const onOpenChangeRef = React.useRef(onOpenChange);
	const titleId = React.useId();
	const descriptionId = React.useId();
	React.useEffect(() => {
		onOpenChangeRef.current = onOpenChange;
	});
	useModalLayer({ open, panelRef, onDismiss: () => onOpenChangeRef.current(false), initialFocusRef });

	if (!open || typeof document === "undefined") return null;

	const header = (
		<div className={cn("flex min-w-0 shrink-0", danger && "items-start gap-4", hideTitle && "sr-only")}>
			{danger && (
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
					<TriangleAlert className="h-5 w-5" aria-hidden="true" />
				</span>
			)}
			<div className={cn("flex min-w-0 flex-1 flex-col gap-1.5", danger && "pt-1.5", headerClassName)}>
				<div className="flex min-w-0 items-center gap-3">
					<h2 id={titleId} className={cn("min-w-0 flex-1 text-lg font-semibold leading-snug text-neutral-900 wrap-anywhere", showClose && !headerActions && "pr-8")}>
						{title}
					</h2>
					{headerActions && <div className={cn("flex shrink-0 items-center gap-2", showClose && "pr-8")}>{headerActions}</div>}
				</div>
				{description && (
					<div id={descriptionId} className="text-sm text-neutral-500 wrap-anywhere">
						{description}
					</div>
				)}
			</div>
		</div>
	);
	const content = (
		<>
			<div className={cn("-mx-6 min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-1", bodyClassName)}>{children}</div>
			{footer && <div className={cn("flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end", footerClassName)}>{footer}</div>}
		</>
	);

	return createPortal(
		<div className="fixed inset-0 z-50">
			<div
				data-state="open"
				className={cn("dialog-overlay absolute inset-0 bg-black/35", backdropClassName)}
				onMouseDown={(event) => {
					if (closeOnBackdrop && event.target === event.currentTarget) onOpenChange(false);
				}}
			/>
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={description ? descriptionId : undefined}
				tabIndex={-1}
				data-state="open"
				className={cn("absolute z-10 flex flex-col gap-5 bg-white text-neutral-900 shadow-xl outline-none", panelClassName)}
				{...panelProps}
			>
				{header}
				{onSubmit ? (
					<form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col gap-5">
						{content}
					</form>
				) : content}
				{showClose && (
					<button
						type="button"
						aria-label={closeLabel ?? t("navigation.close")}
						title={closeLabel ?? t("navigation.close")}
						className={cn("absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 outline-none transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-blue-600", closeClassName)}
						onClick={() => onOpenChange(false)}
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>
		</div>,
		document.body,
	);
}
