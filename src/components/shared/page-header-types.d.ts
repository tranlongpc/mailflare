import type * as React from "react";

export type PageHeaderProps = {
	title: React.ReactNode;
	description?: React.ReactNode;
	actions?: React.ReactNode;
	className?: string;
	/** Extra lines under the description (e.g. a seat counter). */
	children?: React.ReactNode;
};
