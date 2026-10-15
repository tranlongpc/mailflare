import { cn } from "@/lib/utils";
import type { EmptyStateProps } from "./empty-state-types";

/** What a list shows when it has nothing in it. */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
	return (
		<div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
			{icon && <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 [&_svg]:h-5 [&_svg]:w-5">{icon}</span>}
			<div className="max-w-sm">
				<p className="text-sm font-medium text-neutral-900">{title}</p>
				{description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
			</div>
			{action}
		</div>
	);
}
