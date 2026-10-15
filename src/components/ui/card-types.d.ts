import type * as React from "react";

/** panel: white rounded block (default); section: top-bordered settings section; bordered: outlined box; plain: no chrome. */
export type CardVariant = "panel" | "section" | "bordered" | "plain";

export type CardProps = Omit<React.HTMLAttributes<HTMLElement>, "title"> & {
	title?: React.ReactNode;
	description?: React.ReactNode;
	icon?: React.ReactNode;
	actions?: React.ReactNode;
	footer?: React.ReactNode;
	variant?: CardVariant;
	padding?: boolean;
	headerClassName?: string;
	contentClassName?: string;
	footerClassName?: string;
};
