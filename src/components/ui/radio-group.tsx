import { cn } from "@/lib/utils";
import type { RadioGroupProps } from "./radio-group-types";

/** A set of radio options. Each option can carry a description; `variant="cards"` renders bordered tiles. */
export function RadioGroup({ name, options, value, onValueChange, orientation = "vertical", variant = "default", disabled, className, ...props }: RadioGroupProps) {
	return (
		<div role="radiogroup" data-slot="radio-group" className={cn("flex gap-3", orientation === "vertical" ? "flex-col" : "flex-wrap", className)} {...props}>
			{options.map((option) => {
				const checked = option.value === value;
				return (
					<label
						key={option.value}
						className={cn(
							"flex cursor-pointer items-start gap-3 text-sm text-neutral-900 has-disabled:cursor-not-allowed has-disabled:opacity-60",
							variant === "cards" && "rounded-xl bg-neutral-50 p-4 ring-1 ring-transparent has-checked:bg-blue-50 has-checked:ring-blue-200",
						)}
					>
						<input
							type="radio"
							name={name}
							value={option.value}
							checked={checked}
							disabled={disabled || option.disabled}
							onChange={() => onValueChange(option.value)}
							className="mt-0.5 h-4 w-4 shrink-0 border-neutral-300 text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
						/>
						<span className="min-w-0">
							<span className="block font-medium">{option.label}</span>
							{option.description && <span className="mt-1 block text-sm text-neutral-500">{option.description}</span>}
						</span>
					</label>
				);
			})}
		</div>
	);
}
