import { cn } from "@/lib/utils";
import type { PageHeaderProps } from "./page-header-types";

/** The title row of an admin or settings page: h1, one-line description, actions on the right. */
export function PageHeader({ title, description, actions, className, children }: PageHeaderProps) {
	return (
		<div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
			<div className="min-w-0">
				<h1 className="text-2xl font-medium text-neutral-900 md:text-3xl">{title}</h1>
				{description && <p className="mt-2 text-sm text-neutral-500">{description}</p>}
				{children}
			</div>
			{actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
		</div>
	);
}
