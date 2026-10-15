import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertProps, AlertVariant } from "./alert-types";

const variants: Record<AlertVariant, string> = {
	default: "border-neutral-200 bg-neutral-50 text-neutral-800",
	info: "border-blue-100 bg-blue-50 text-blue-800",
	success: "border-green-100 bg-green-50 text-green-800",
	warning: "border-amber-100 bg-amber-50 text-amber-800",
	destructive: "border-red-100 bg-red-50 text-red-700",
};

const icons: Record<AlertVariant, typeof Info | null> = {
	default: null,
	info: Info,
	success: CircleCheck,
	warning: TriangleAlert,
	destructive: CircleAlert,
};

/** An inline message box: errors, warnings, notices. `children` is the message when there is no `title`. */
export function Alert({ variant = "default", title, description, icon, actions, showIcon = false, className, children, ...props }: AlertProps) {
	const Icon = icons[variant];
	const iconNode = icon ?? (showIcon && Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null);
	return (
		<div
			role={variant === "destructive" || variant === "warning" ? "alert" : "status"}
			data-slot="alert"
			className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm", variants[variant], className)}
			{...props}
		>
			{iconNode && <span className="mt-0.5 shrink-0">{iconNode}</span>}
			<div className="min-w-0 flex-1">
				{title && <p className="font-semibold">{title}</p>}
				{description && <div className={cn(title && "mt-1", "opacity-90")}>{description}</div>}
				{children && <div className={cn(!title && "font-medium", (title || description) && "mt-2")}>{children}</div>}
			</div>
			{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
		</div>
	);
}
