import type * as React from "react";

export type ButtonVariant = "default" | "outline" | "ghost" | "destructive" | "secondary" | "link" | "unstyled";
export type ButtonSize = "default" | "sm" | "lg" | "pill" | "roundedSM" | "icon-sm" | "icon" | "icon-lg" | "none";

export type ButtonProps = React.ComponentProps<"button"> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
	asChild?: boolean;
};
