import { cn } from "@/lib/utils";
import type { SeparatorProps } from "./separator-types";

export function Separator({ orientation = "horizontal", className, ...props }: SeparatorProps) {
	return <div role="separator" aria-orientation={orientation} data-slot="separator" className={cn("shrink-0 bg-neutral-200", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)} {...props} />;
}
