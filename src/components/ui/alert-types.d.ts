import type * as React from "react";

export type AlertVariant = "default" | "info" | "success" | "warning" | "destructive";

export type AlertProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
	variant?: AlertVariant;
	title?: React.ReactNode;
	description?: React.ReactNode;
	icon?: React.ReactNode;
	/** Shows the default icon of the variant when no `icon` is given. */
	showIcon?: boolean;
	actions?: React.ReactNode;
};
