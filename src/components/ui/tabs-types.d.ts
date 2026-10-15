import type * as React from "react";

export type TabItem = { value: string; label: React.ReactNode; icon?: React.ReactNode; content?: React.ReactNode; disabled?: boolean };

export type TabsProps = {
	items: readonly TabItem[];
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	className?: string;
	listClassName?: string;
	panelClassName?: string;
};
