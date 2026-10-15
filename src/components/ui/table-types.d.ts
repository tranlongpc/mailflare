import type * as React from "react";

export type TableProps = React.ComponentProps<"table"> & { containerClassName?: string };
export type TableSectionProps = React.ComponentProps<"thead">;
export type TableRowProps = React.ComponentProps<"tr">;
export type TableHeadProps = React.ComponentProps<"th">;
export type TableCellProps = React.ComponentProps<"td">;
