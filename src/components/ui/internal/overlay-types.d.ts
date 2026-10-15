import type * as React from "react";

export type OverlayProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: React.ReactNode;
	/** Keeps the title for screen readers but hides it visually (the body renders its own heading). */
	hideTitle?: boolean;
	/** Adds a warning icon beside the title. */
	danger?: boolean;
	/** Controls beside the title; the row keeps clear of the close button. */
	headerActions?: React.ReactNode;
	description?: React.ReactNode;
	children?: React.ReactNode;
	footer?: React.ReactNode;
	/** Wraps body and footer in a form, so footer buttons can be `type="submit"`. */
	onSubmit?: React.FormEventHandler<HTMLFormElement>;
	closeLabel?: string;
	closeOnBackdrop?: boolean;
	showClose?: boolean;
	initialFocusRef?: React.RefObject<HTMLElement | null>;
	backdropClassName?: string;
	panelClassName?: string;
	bodyClassName?: string;
	headerClassName?: string;
	closeClassName?: string;
	footerClassName?: string;
	panelProps?: React.HTMLAttributes<HTMLDivElement>;
};
