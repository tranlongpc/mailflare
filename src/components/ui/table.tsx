import { cn } from "@/lib/utils";
import type { TableCellProps, TableHeadProps, TableProps, TableRowProps, TableSectionProps } from "./table-types";

export function Table({ className, containerClassName, ...props }: TableProps) {
	return (
		<div data-slot="table-container" className={cn("w-full min-w-0 overflow-x-auto", containerClassName)}>
			<table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...props} />
		</div>
	);
}

export function TableHeader({ className, ...props }: TableSectionProps) {
	return <thead data-slot="table-header" className={cn("border-b border-neutral-200 text-left text-xs font-medium text-neutral-500", className)} {...props} />;
}

export function TableBody({ className, ...props }: TableSectionProps) {
	return <tbody data-slot="table-body" className={cn("divide-y divide-neutral-100", className)} {...props} />;
}

export function TableRow({ className, ...props }: TableRowProps) {
	return <tr data-slot="table-row" className={cn("transition-colors", className)} {...props} />;
}

export function TableHead({ className, ...props }: TableHeadProps) {
	return <th data-slot="table-head" className={cn("px-4 py-3 text-left align-middle font-medium whitespace-nowrap", className)} {...props} />;
}

export function TableCell({ className, ...props }: TableCellProps) {
	return <td data-slot="table-cell" className={cn("px-4 py-3 align-middle", className)} {...props} />;
}
