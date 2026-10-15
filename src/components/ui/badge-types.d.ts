import type * as React from "react";

export type BadgeVariant = "default" | "secondary" | "outline" | "success" | "warning" | "destructive" | "info";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant };
