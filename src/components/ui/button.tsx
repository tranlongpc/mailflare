import { cn } from "@/lib/utils";
import { Slot } from "./internal/slot";
import type { ButtonProps, ButtonSize, ButtonVariant } from "./button-types";

const variants: Record<ButtonVariant, string> = {
	default: "bg-blue-600 text-white hover:bg-blue-700",
	outline: "border border-neutral-200 bg-white hover:bg-neutral-100",
	ghost: "hover:bg-neutral-100",
	destructive: "bg-red-600 text-white hover:bg-red-700",
	secondary: "bg-neutral-100 hover:bg-neutral-200",
	// Looks like text: row titles, inline actions, links inside sentences.
	link: "h-auto p-0 text-blue-700 underline-offset-4 hover:underline",
	// No chrome at all; the caller styles it (menu rows, chips, list rows that act as buttons).
	unstyled: "",
};

const sizes: Record<ButtonSize, string> = {
	default: "h-10 rounded-xl px-6 py-2",
	sm: "h-8 rounded-lg px-3 text-xs",
	lg: "h-11 rounded-xl px-8",
	pill: "h-11 w-full rounded-full px-6 active:scale-[0.98]",
	roundedSM: "rounded-full p-2 text-xs",
	"icon-sm": "h-8 w-8 shrink-0 rounded-full p-0",
	icon: "h-9 w-9 shrink-0 rounded-full p-0",
	"icon-lg": "h-10 w-10 shrink-0 rounded-full p-0",
	none: "",
};

export function buttonClassName({ variant = "default", size = "default", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
	return cn(
		variant !== "unstyled" && "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
		variant === "unstyled" && "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
		variants[variant],
		variant === "unstyled" || variant === "link" ? undefined : sizes[size],
		variant === "unstyled" && size !== "default" ? sizes[size] : undefined,
		className,
	);
}

/** The one clickable control. `asChild` renders the child (a Link) with button styling. */
export function Button({ className, variant = "default", size = "default", asChild = false, type, ref, ...props }: ButtonProps) {
	const classes = buttonClassName({ variant, size, className });
	if (asChild) return <Slot className={classes} data-slot="button" ref={ref as never} {...props} />;
	return <button ref={ref} type={type} data-slot="button" className={classes} {...props} />;
}
