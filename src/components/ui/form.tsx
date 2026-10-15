import { cn } from "@/lib/utils";
import { Label } from "./label";
import type { FormFieldProps, FormProps, FormSectionProps, FormSpacing } from "./form-types";

const spacings: Record<FormSpacing, string> = {
	none: "",
	compact: "space-y-3",
	default: "space-y-4",
	relaxed: "space-y-6",
};

/** A form with consistent vertical rhythm between its fields. */
export function Form({ spacing = "default", className, ref, ...props }: FormProps) {
	return <form ref={ref} data-slot="form" className={cn(spacings[spacing], className)} {...props} />;
}

/** Label, control, help text and error for one field. The control is `children`. */
export function FormField({ label, htmlFor, description, error, errorId, required, actions, className, labelClassName, children }: FormFieldProps) {
	return (
		<div data-slot="form-field" className={cn("space-y-2", className)}>
			{(label || actions) && (
				<div className="flex items-center justify-between gap-3">
					{label && (
						<Label htmlFor={htmlFor} className={labelClassName}>
							{label}
							{required && <span className="ml-0.5 text-red-600" aria-hidden="true">*</span>}
						</Label>
					)}
					{actions && <div className="flex shrink-0 items-center gap-2 text-xs">{actions}</div>}
				</div>
			)}
			{children}
			{description && !error && <p className="text-xs text-neutral-500">{description}</p>}
			{error && (
				<p id={errorId} role="alert" className="text-xs text-red-600">
					{error}
				</p>
			)}
		</div>
	);
}

/** A titled group of fields inside a longer form. */
export function FormSection({ title, description, icon, actions, className, children }: FormSectionProps) {
	return (
		<section data-slot="form-section" className={cn("space-y-4", className)}>
			{(title || description || actions) && (
				<div className="flex items-start gap-3">
					{icon && <span className="mt-0.5 text-neutral-500 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
					<div className="min-w-0 flex-1">
						{title && <h4 className="text-base font-semibold text-neutral-900">{title}</h4>}
						{description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
					</div>
					{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
				</div>
			)}
			{children}
		</section>
	);
}
