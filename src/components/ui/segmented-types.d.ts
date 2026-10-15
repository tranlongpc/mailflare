import type * as React from "react";

export type SegmentedOption = { value: string; label?: React.ReactNode; icon?: React.ReactNode; ariaLabel?: string; disabled?: boolean };

export type SegmentedProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> & {
	options: readonly SegmentedOption[];
	value: string;
	onValueChange: (value: string) => void;
	size?: "default" | "sm";
};
