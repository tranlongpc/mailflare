import type * as React from "react";

export type SlotProps = React.HTMLAttributes<HTMLElement> & {
	children?: React.ReactNode;
	ref?: React.Ref<HTMLElement>;
	[key: `data-${string}`]: unknown;
};
