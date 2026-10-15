import { cn } from "@/lib/utils";
import { Slot } from "./internal/slot";
import type { ListProps, ListRowProps } from "./list-types";

export function List({ className, ...props }: ListProps) {
	return <div className={cn("grid gap-1 [&>*:first-child]:rounded-t-3xl [&>*:last-child]:rounded-b-3xl", className)} {...props} />;
}

export function ListRow({ className, asChild = false, ...props }: ListRowProps) {
	const classes = cn("flex items-center gap-4 rounded-lg bg-white p-5", className);
	return asChild ? <Slot className={classes} {...props} /> : <div className={classes} {...props} />;
}
