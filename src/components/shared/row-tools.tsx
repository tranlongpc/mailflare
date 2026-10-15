"use client";

import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import type { RowToolsProps } from "./row-tools-types";

/** The kebab menu of actions on one row or card. */
export function RowTools({ label, tools, align = "end", disabled }: RowToolsProps) {
	return (
		<DropdownMenu
			align={align}
			items={tools}
			trigger={
				<Button variant="ghost" size="icon-sm" aria-label={label} title={label} disabled={disabled}>
					<MoreVertical className="h-4 w-4" />
				</Button>
			}
		/>
	);
}
