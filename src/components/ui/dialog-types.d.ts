import type { OverlayProps } from "./internal/overlay-types";

export type DialogProps = Omit<OverlayProps, "panelClassName" | "panelProps"> & {
	/** Panel classes, e.g. a wider `w-[min(640px,calc(100vw-2rem))]`. */
	className?: string;
	panelProps?: OverlayProps["panelProps"];
};
