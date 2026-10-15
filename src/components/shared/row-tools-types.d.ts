import type { DropdownItem } from "@/components/ui/dropdown-menu-types";
import type { FloatingAlign } from "@/components/ui/internal/floating-types";

export type RowToolsProps = {
	/** Accessible name of the trigger, e.g. "Actions for invoice.pdf". */
	label: string;
	tools: readonly DropdownItem[];
	align?: FloatingAlign;
	disabled?: boolean;
};
