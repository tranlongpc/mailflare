import * as React from "react";
import type { ModalLayerOptions } from "./modal-layer-types";

// Every open modal panel, oldest first; only the newest one reacts to Escape and traps Tab.
const modalStack: HTMLElement[] = [];
let bodyLockCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";

export function focusableElements(container: HTMLElement) {
	return Array.from(
		container.querySelectorAll<HTMLElement>(
			'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[contenteditable="true"],[tabindex]:not([tabindex="-1"])',
		),
	).filter((element) => {
		if (element.hidden || element.closest("[hidden],[inert]")) return false;
		const style = window.getComputedStyle(element);
		return style.display !== "none" && style.visibility !== "hidden";
	});
}

function topModal() {
	return modalStack[modalStack.length - 1] ?? null;
}

function lockBodyScroll() {
	if (bodyLockCount === 0) {
		previousBodyOverflow = document.body.style.overflow;
		previousBodyPaddingRight = document.body.style.paddingRight;
		const documentWidth = document.documentElement.clientWidth;
		const scrollbarWidth = documentWidth > 0 ? Math.max(0, window.innerWidth - documentWidth) : 0;
		if (scrollbarWidth > 0) {
			const currentPadding = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
			document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
		}
		document.body.style.overflow = "hidden";
	}
	bodyLockCount += 1;
}

function unlockBodyScroll() {
	bodyLockCount = Math.max(0, bodyLockCount - 1);
	if (bodyLockCount > 0) return;
	document.body.style.overflow = previousBodyOverflow;
	document.body.style.paddingRight = previousBodyPaddingRight;
}

/** Focus trap, Escape, scroll lock and focus restore for one modal panel. */
export function useModalLayer({ open, panelRef, onDismiss, restoreFocusTo, initialFocusRef }: ModalLayerOptions) {
	const onDismissRef = React.useRef(onDismiss);
	const restoreFrameRef = React.useRef<number | undefined>(undefined);
	React.useEffect(() => {
		onDismissRef.current = onDismiss;
	});

	React.useLayoutEffect(() => {
		const panel = panelRef.current;
		if (!open || !panel) return;
		if (restoreFrameRef.current !== undefined) {
			cancelAnimationFrame(restoreFrameRef.current);
			restoreFrameRef.current = undefined;
		}
		const previousFocus = restoreFocusTo?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
		modalStack.push(panel);
		lockBodyScroll();
		const autoFocus = panel.querySelector<HTMLElement>("[autofocus],[data-autofocus]");
		(initialFocusRef?.current ?? autoFocus ?? focusableElements(panel)[0] ?? panel).focus();

		const handleKeyDown = (event: KeyboardEvent) => {
			if (topModal() !== panel) return;
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				onDismissRef.current();
				return;
			}
			if (event.key !== "Tab") return;
			const elements = focusableElements(panel);
			if (!elements.length) {
				event.preventDefault();
				panel.focus();
				return;
			}
			const first = elements[0];
			const last = elements[elements.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown, true);
		return () => {
			document.removeEventListener("keydown", handleKeyDown, true);
			const wasTop = topModal() === panel;
			const index = modalStack.lastIndexOf(panel);
			if (index >= 0) modalStack.splice(index, 1);
			const nextTop = topModal();
			unlockBodyScroll();
			if (!wasTop) return;
			restoreFrameRef.current = requestAnimationFrame(() => {
				restoreFrameRef.current = undefined;
				if (topModal() !== nextTop) return;
				if (previousFocus?.isConnected && (!nextTop || nextTop.contains(previousFocus))) previousFocus.focus();
			});
		};
	}, [open, panelRef, restoreFocusTo, initialFocusRef]);
}
