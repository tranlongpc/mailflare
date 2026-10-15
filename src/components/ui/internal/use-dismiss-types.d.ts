import type * as React from "react";

export type DismissReason = "escape" | "outside-pointer" | "window-blur" | "scroll" | "resize";

export type DismissOptions = {
	open: boolean;
	onDismiss: (reason: DismissReason) => void;
	/** Elements that count as inside; the last one is the layer's own panel. */
	insideRefs?: readonly React.RefObject<HTMLElement | null>[];
	dismissOnEscape?: boolean;
	dismissOnPointerDownOutside?: boolean;
	dismissOnWindowBlur?: boolean;
	dismissOnScroll?: boolean;
	dismissOnResize?: boolean;
	restoreFocusTo?: React.RefObject<HTMLElement | null>;
};
