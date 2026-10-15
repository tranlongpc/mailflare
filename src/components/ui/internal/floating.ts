import * as React from "react";
import type { FloatingAnchor, FloatingPositionOptions } from "./floating-types";

const hiddenFloatingStyle: React.CSSProperties = {
	position: "fixed",
	top: 0,
	left: 0,
	visibility: "hidden",
	opacity: 0,
	pointerEvents: "none",
};

function hide(element: HTMLElement) {
	element.style.visibility = "hidden";
	element.style.opacity = "0";
	element.style.pointerEvents = "none";
}

/** Anchors a floating layer to an element this component does not render, or to a point on screen. */
export function useExternalAnchor(anchor: FloatingAnchor | null | undefined) {
	const anchorRef = React.useRef<FloatingAnchor | null>(null);
	const elementRef = React.useRef<HTMLElement | null>(null);
	React.useLayoutEffect(() => {
		anchorRef.current = anchor ?? null;
		elementRef.current = anchor instanceof HTMLElement ? anchor : null;
	});
	return { anchorRef, elementRef };
}

/** Keeps a fixed-position layer next to its anchor, flipping above or below to stay in the viewport. */
export function useFloatingPosition({ open, anchorRef, floatingRef, align = "start", side = "bottom", offset = 4, matchWidth = false }: FloatingPositionOptions) {
	const update = React.useCallback(() => {
		const anchor = anchorRef.current;
		const floating = floatingRef.current;
		const elementAnchor = anchor instanceof HTMLElement;
		if (!anchor || !floating || (elementAnchor && !anchor.isConnected) || !floating.isConnected) {
			if (floating) hide(floating);
			return false;
		}
		const anchorRect = anchor.getBoundingClientRect();
		if (matchWidth) floating.style.minWidth = `${anchorRect.width}px`;
		const floatingRect = floating.getBoundingClientRect();
		if ((elementAnchor && (anchorRect.width === 0 || anchorRect.height === 0)) || floatingRect.width === 0 || floatingRect.height === 0) {
			hide(floating);
			return false;
		}
		const edge = 8;
		const viewportHeight = window.innerHeight;
		let top = anchorRect.bottom + offset;
		let left = anchorRect.left;

		if (side === "top") top = anchorRect.top - floatingRect.height - offset;
		if (side === "right") {
			top = anchorRect.top;
			left = anchorRect.right + offset;
		}
		if (side === "left") {
			top = anchorRect.top;
			left = anchorRect.left - floatingRect.width - offset;
		}
		if (side === "top" || side === "bottom") {
			if (align === "center") left = anchorRect.left + (anchorRect.width - floatingRect.width) / 2;
			if (align === "end") left = anchorRect.right - floatingRect.width;
			const alternativeTop = side === "bottom" ? anchorRect.top - floatingRect.height - offset : anchorRect.bottom + offset;
			if (top + floatingRect.height > viewportHeight - edge && alternativeTop >= edge) top = alternativeTop;
			if (top < edge && alternativeTop + floatingRect.height <= viewportHeight - edge) top = alternativeTop;
		} else {
			if (align === "center") top = anchorRect.top + (anchorRect.height - floatingRect.height) / 2;
			if (align === "end") top = anchorRect.bottom - floatingRect.height;
			const alternativeLeft = side === "right" ? anchorRect.left - floatingRect.width - offset : anchorRect.right + offset;
			if (left + floatingRect.width > window.innerWidth - edge && alternativeLeft >= edge) left = alternativeLeft;
			if (left < edge && alternativeLeft + floatingRect.width <= window.innerWidth - edge) left = alternativeLeft;
		}

		floating.style.top = `${Math.max(edge, Math.min(top, viewportHeight - floatingRect.height - edge))}px`;
		floating.style.left = `${Math.max(edge, Math.min(left, window.innerWidth - floatingRect.width - edge))}px`;
		floating.style.visibility = "visible";
		floating.style.opacity = "1";
		floating.style.pointerEvents = "auto";
		return true;
	}, [align, anchorRef, floatingRef, matchWidth, offset, side]);

	React.useLayoutEffect(() => {
		if (floatingRef.current) hide(floatingRef.current);
		if (!open) return;
		let frame: number | undefined;
		if (!update()) frame = requestAnimationFrame(update);
		const anchor = anchorRef.current;
		const elementAnchor = anchor instanceof HTMLElement;
		const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update);
		if (elementAnchor) observer?.observe(anchor);
		if (floatingRef.current) observer?.observe(floatingRef.current);
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);
		return () => {
			if (frame !== undefined) cancelAnimationFrame(frame);
			observer?.disconnect();
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, [anchorRef, floatingRef, open, update]);

	return hiddenFloatingStyle;
}
