"use client";

import { cn } from "@/lib/utils";
import { Overlay } from "./internal/overlay";
import type { SheetProps, SheetSide } from "./sheet-types";

const sideClasses: Record<SheetSide, string> = {
	top: "inset-x-0 top-0 max-h-[90dvh] rounded-b-3xl",
	right: "inset-y-0 right-0 w-[min(100%,36rem)]",
	bottom: "slide-sheet inset-x-0 bottom-0 max-h-[90dvh] rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]",
	left: "inset-y-0 left-0 w-[min(100%,36rem)]",
};

/** A modal panel docked to one edge of the screen. */
export function Sheet({ side = "right", className, ...props }: SheetProps) {
	return <Overlay {...props} panelClassName={cn("max-w-full overflow-hidden p-6", sideClasses[side], className)} footerClassName={cn("mt-auto", props.footerClassName)} />;
}
