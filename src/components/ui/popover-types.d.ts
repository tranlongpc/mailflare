import type * as React from "react";
import type { FloatingAlign, FloatingAnchor, FloatingSide } from "./internal/floating-types";

export type PopoverProps = {
	/** The element that opens the popover. Leave it out and pass `anchor` when something else opens it. */
	trigger?: React.ReactElement<Record<string, unknown>>;
	/** Positions the popover against an element this component does not render, or a point (a text caret). */
	anchor?: FloatingAnchor | null;
	/** The panel content, or a function receiving `close`. */
	children: React.ReactNode | ((api: { close: () => void }) => React.ReactNode);
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	align?: FloatingAlign;
	side?: FloatingSide;
	offset?: number;
	/** Traps focus and dims the page. */
	modal?: boolean;
	/** Makes the panel at least as wide as the trigger. */
	matchWidth?: boolean;
	className?: string;
	ariaLabel?: string;
};
