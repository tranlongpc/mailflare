"use client";

import { cn } from "@/lib/utils";
import { Overlay } from "./internal/overlay";
import type { DialogProps } from "./dialog-types";

/** A centered modal. Pass `title`, `description`, `footer`; `onSubmit` turns body and footer into one form. */
export function Dialog({ className, bodyClassName, ...props }: DialogProps) {
	return (
		<Overlay
			{...props}
			panelClassName={cn(
				"dialog-content left-1/2 top-1/2 max-h-[calc(100dvh-2rem)] w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6",
				className,
			)}
			bodyClassName={bodyClassName}
		/>
	);
}
