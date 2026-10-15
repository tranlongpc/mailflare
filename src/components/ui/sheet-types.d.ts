import type { OverlayProps } from "./internal/overlay-types";

export type SheetSide = "top" | "right" | "bottom" | "left";

export type SheetProps = Omit<OverlayProps, "panelClassName"> & {
	side?: SheetSide;
	className?: string;
};
