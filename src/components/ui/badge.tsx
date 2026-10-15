import { cn } from "@/lib/utils";
import type { BadgeProps, BadgeVariant } from "./badge-types";

const variants: Record<BadgeVariant, string> = {
	default: "bg-neutral-900 text-neutral-50",
	secondary: "bg-neutral-100 text-neutral-900",
	outline: "bg-neutral-100",
	success: "bg-green-600/10 text-green-800",
	warning: "bg-amber-500/15 text-amber-800",
	destructive: "bg-red-600/10 text-red-700",
	info: "bg-blue-600/10 text-blue-800",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
	return <span data-slot="badge" className={cn("inline-flex items-center rounded-md px-2.5 py-0.5 text-[9px] font-semibold uppercase transition-colors", variants[variant], className)} {...props} />;
}
