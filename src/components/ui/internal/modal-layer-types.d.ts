import type * as React from "react";

export type ModalLayerOptions = {
	open: boolean;
	panelRef: React.RefObject<HTMLElement | null>;
	onDismiss: () => void;
	restoreFocusTo?: React.RefObject<HTMLElement | null>;
	/** Receives focus on open instead of the first focusable element. */
	initialFocusRef?: React.RefObject<HTMLElement | null>;
};
