import type * as React from "react";

export type FloatingAlign = "start" | "center" | "end";
export type FloatingSide = "top" | "right" | "bottom" | "left";
export type VirtualFloatingAnchor = { getBoundingClientRect: () => DOMRect };
export type FloatingAnchor = HTMLElement | VirtualFloatingAnchor;

export type FloatingPositionOptions = {
	open: boolean;
	anchorRef: React.RefObject<FloatingAnchor | null>;
	floatingRef: React.RefObject<HTMLElement | null>;
	align?: FloatingAlign;
	side?: FloatingSide;
	offset?: number;
	/** Makes the layer at least as wide as its anchor (select lists). */
	matchWidth?: boolean;
};
