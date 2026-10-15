import { cn } from "@/lib/utils";
import type { SegmentedProps } from "./segmented-types";

/** A row of mutually exclusive buttons (view switches, small option sets). */
export function Segmented({ options, value, onValueChange, size = "default", className, ...props }: SegmentedProps) {
	return (
		<div role="radiogroup" data-slot="segmented" className={cn("inline-flex items-center gap-1 rounded-full bg-neutral-100 p-1", className)} {...props}>
			{options.map((option) => {
				const active = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						role="radio"
						aria-checked={active}
						aria-label={option.ariaLabel}
						title={option.ariaLabel}
						disabled={option.disabled}
						onClick={() => onValueChange(option.value)}
						className={cn(
							"inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full font-medium text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4",
							size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
							active && "bg-white text-neutral-900 shadow-sm",
						)}
					>
						{option.icon}
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
