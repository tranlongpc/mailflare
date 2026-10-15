import type * as React from "react";

export type ListProps = React.HTMLAttributes<HTMLDivElement>;
export type ListRowProps = React.HTMLAttributes<HTMLElement> & { asChild?: boolean };
