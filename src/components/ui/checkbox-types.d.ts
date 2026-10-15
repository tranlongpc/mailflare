import type * as React from "react";

export type CheckboxProps = Omit<React.ComponentProps<"input">, "type"> & {
	label?: React.ReactNode;
	description?: React.ReactNode;
	/** Classes for the row wrapper when `label` is set. */
	labelClassName?: string;
};
