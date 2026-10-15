import { Select } from "@/components/ui/select";
import type { SelectProps } from "@/components/ui/select-types";
import { cn } from "@/lib/utils";

export function RoutingRuleSelect({ className, containerClassName, ...props }: SelectProps) {
	return <Select containerClassName={cn("flex w-full rounded-md shadow-sm shadow-neutral-200/50", containerClassName)} className={cn("truncate pr-9", className)} {...props} />;
}
