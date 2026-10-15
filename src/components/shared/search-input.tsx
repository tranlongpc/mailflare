"use client";

import { Search, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SearchInputProps } from "./search-input-types";

/** A search box with a leading icon and a clear button. */
export function SearchInput({ value, onValueChange, clearLabel, className, containerClassName, ...props }: SearchInputProps) {
	const { t } = useLanguage();
	return (
		<div className={cn("relative min-w-0", containerClassName)}>
			<Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
			<Input type="search" value={value} onChange={(event) => onValueChange(event.target.value)} className={cn("pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden", className)} {...props} />
			{value && (
				<Button variant="ghost" size="icon-sm" aria-label={clearLabel ?? t("common.clear")} className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => onValueChange("")}>
					<X className="h-4 w-4" />
				</Button>
			)}
		</div>
	);
}
