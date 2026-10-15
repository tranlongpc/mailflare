import { cn } from "@/lib/utils";
import type { CheckboxProps } from "./checkbox-types";

const boxClassName = "h-4 w-4 shrink-0 rounded border-neutral-300 text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

/** A checkbox; with `label` (and optional `description`) it renders the whole clickable row. */
export function Checkbox({ className, label, description, labelClassName, ref, ...props }: CheckboxProps) {
	const box = <input ref={ref} type="checkbox" data-slot="checkbox" className={cn(boxClassName, label !== undefined && description !== undefined && "mt-0.5", className)} {...props} />;
	if (label === undefined) return box;
	return (
		<label className={cn("flex cursor-pointer items-start gap-3 text-sm text-neutral-900 has-disabled:cursor-not-allowed has-disabled:opacity-60", description === undefined && "items-center", labelClassName)}>
			{box}
			<span className="min-w-0">
				<span className="block font-medium">{label}</span>
				{description && <span className="mt-1 block text-sm text-neutral-500">{description}</span>}
			</span>
		</label>
	);
}
