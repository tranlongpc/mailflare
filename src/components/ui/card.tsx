import { cn } from "@/lib/utils";
import type { CardProps, CardVariant } from "./card-types";

const variants: Record<CardVariant, string> = {
	panel: "rounded-3xl bg-white",
	section: "border-t border-neutral-200",
	bordered: "rounded-2xl border border-neutral-200 bg-white",
	plain: "",
};

const paddings: Record<CardVariant, string> = {
	panel: "p-6",
	section: "py-6",
	bordered: "p-5",
	plain: "",
};

/** One semantic panel. Pass `title`, `description`, `icon`, `actions`, `footer`; the body is `children`. */
export function Card({
	title,
	description,
	icon,
	actions,
	footer,
	variant = "panel",
	padding = true,
	className,
	headerClassName,
	contentClassName,
	footerClassName,
	children,
	...props
}: CardProps) {
	const hasHeader = title || description || icon || actions;
	return (
		<section data-slot="card" className={cn("flex min-w-0 flex-col gap-5", variants[variant], padding && paddings[variant], className)} {...props}>
			{hasHeader && (
				<div className={cn("flex min-w-0 items-start gap-3", headerClassName)}>
					{icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 [&_svg]:h-5 [&_svg]:w-5">{icon}</span>}
					<div className="min-w-0 flex-1">
						{title && <h3 className="text-lg font-semibold leading-snug text-neutral-900">{title}</h3>}
						{description && <div className={cn("text-sm text-neutral-500", title && "mt-1")}>{description}</div>}
					</div>
					{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
				</div>
			)}
			{children !== undefined && children !== null && children !== false && <div className={cn("min-w-0", contentClassName)}>{children}</div>}
			{footer && <div className={cn("flex flex-wrap items-center justify-end gap-2", footerClassName)}>{footer}</div>}
		</section>
	);
}
