import type * as React from "react";

export type FormSpacing = "none" | "compact" | "default" | "relaxed";

export type FormProps = React.ComponentProps<"form"> & { spacing?: FormSpacing };

export type FormFieldProps = {
	label?: React.ReactNode;
	htmlFor?: string;
	description?: React.ReactNode;
	error?: React.ReactNode;
	errorId?: string;
	required?: boolean;
	/** Small controls beside the label (e.g. a forgot-password link). */
	actions?: React.ReactNode;
	className?: string;
	labelClassName?: string;
	children: React.ReactNode;
};

export type FormSectionProps = {
	title?: React.ReactNode;
	description?: React.ReactNode;
	icon?: React.ReactNode;
	actions?: React.ReactNode;
	className?: string;
	children?: React.ReactNode;
};
