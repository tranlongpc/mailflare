import type * as React from "react";

export type RadioOption = { value: string; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean };

export type RadioGroupProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> & {
	name: string;
	options: readonly RadioOption[];
	value: string;
	onValueChange: (value: string) => void;
	orientation?: "vertical" | "horizontal";
	variant?: "default" | "cards";
	disabled?: boolean;
};
