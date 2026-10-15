import { cn } from "@/lib/utils";
import type { LabelProps } from "./label-types";

export function Label({ className, ref, ...props }: LabelProps) {
	return <label ref={ref} data-slot="label" className={cn("text-sm font-medium leading-none text-neutral-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />;
}
