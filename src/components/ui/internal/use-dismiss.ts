import * as React from "react";
import type { DismissOptions, DismissReason } from "./use-dismiss-types";

/**
 * Floating layers open right now, oldest first. A layer opened from inside another is a child:
 * pressing in it is not "outside" its parent, and Escape closes only the newest layer.
 */
const openLayers: HTMLElement[] = [];

function insideLaterLayer(event: Event, own: HTMLElement | null) {
	const index = own ? openLayers.indexOf(own) : -1;
	if (index < 0) return false;
	const target = event.target;
	return openLayers.slice(index + 1).some((layer) => event.composedPath().includes(layer) || (target instanceof Node && layer.contains(target)));
}

function isInside(event: Event, refs: readonly React.RefObject<HTMLElement | null>[]) {
	const path = event.composedPath();
	const target = event.target;
	return refs.some(({ current }) => {
		if (!current) return false;
		if (path.includes(current)) return true;
		return target instanceof Node && current.contains(target);
	});
}

/** Closes a floating layer on Escape or a press outside it (and optionally on blur, scroll or resize). */
export function useDismiss({
	open,
	onDismiss,
	insideRefs = [],
	dismissOnEscape = true,
	dismissOnPointerDownOutside = true,
	dismissOnWindowBlur = false,
	dismissOnScroll = false,
	dismissOnResize = false,
	restoreFocusTo,
}: DismissOptions) {
	const optionsRef = React.useRef({ onDismiss, insideRefs, restoreFocusTo });
	React.useEffect(() => {
		optionsRef.current = { onDismiss, insideRefs, restoreFocusTo };
	});

	React.useEffect(() => {
		if (!open) return;
		let dismissed = false;
		// The last inside ref is the layer's own panel; it registers as the newest open layer.
		const own = optionsRef.current.insideRefs.at(-1)?.current ?? null;
		if (own) openLayers.push(own);
		const isTopLayer = () => !own || openLayers.at(-1) === own;

		const dismiss = (reason: DismissReason) => {
			if (dismissed) return;
			dismissed = true;
			const focusTarget = optionsRef.current.restoreFocusTo?.current;
			optionsRef.current.onDismiss(reason);
			if (reason === "escape") queueMicrotask(() => {
				if (focusTarget?.isConnected) focusTarget.focus();
			});
		};
		const handlePointerDown = (event: PointerEvent) => {
			if (!isInside(event, optionsRef.current.insideRefs) && !insideLaterLayer(event, own)) dismiss("outside-pointer");
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || !isTopLayer()) return;
			event.preventDefault();
			dismiss("escape");
		};
		const handleScroll = (event: Event) => {
			if (!isInside(event, optionsRef.current.insideRefs)) dismiss("scroll");
		};
		const handleBlur = () => dismiss("window-blur");
		const handleResize = () => dismiss("resize");

		if (dismissOnPointerDownOutside) document.addEventListener("pointerdown", handlePointerDown);
		if (dismissOnEscape) document.addEventListener("keydown", handleKeyDown);
		if (dismissOnScroll) document.addEventListener("scroll", handleScroll, true);
		if (dismissOnWindowBlur) window.addEventListener("blur", handleBlur);
		if (dismissOnResize) window.addEventListener("resize", handleResize);

		return () => {
			if (own) openLayers.splice(openLayers.indexOf(own), 1);
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("scroll", handleScroll, true);
			window.removeEventListener("blur", handleBlur);
			window.removeEventListener("resize", handleResize);
		};
	}, [dismissOnEscape, dismissOnPointerDownOutside, dismissOnResize, dismissOnScroll, dismissOnWindowBlur, open]);
}
