import type * as React from "react";
import type { FloatingAlign, FloatingAnchor, FloatingSide } from "./internal/floating-types";

type DropdownItemBase = {
	key: string;
	label: React.ReactNode;
	/** Text matched by the search box when `label` is not a string. */
	searchText?: string;
	description?: React.ReactNode;
	icon?: React.ReactNode;
	disabled?: boolean;
	destructive?: boolean;
	separatorBefore?: boolean;
	shortcut?: string;
	className?: string;
};

export type DropdownAction = DropdownItemBase & {
	onSelect: () => void;
	/** A boolean makes the row a checkbox item; true shows a check mark. */
	checked?: boolean;
	/** Keeps the menu open after selecting (checkbox toggles). */
	keepOpen?: boolean;
	items?: never;
	kind?: never;
};

export type DropdownGroup = DropdownItemBase & {
	/** Opens a nested level in place, with a back row. */
	items: readonly DropdownItem[];
	onSelect?: never;
	checked?: never;
	kind?: never;
};

export type DropdownLabel = {
	kind: "label";
	key: string;
	label: React.ReactNode;
	separatorBefore?: boolean;
};

export type DropdownItem = DropdownAction | DropdownGroup | DropdownLabel;

export type DropdownMenuProps = {
	/** The element that opens the menu. Leave it out and pass `anchor` + `open` when something else opens it. */
	trigger?: React.ReactElement<Record<string, unknown>>;
	anchor?: FloatingAnchor | null;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	items: readonly DropdownItem[];
	/** Content above the items (only at the top level). */
	header?: React.ReactNode;
	/** Content below the items (only at the top level). */
	footer?: React.ReactNode;
	align?: FloatingAlign;
	side?: FloatingSide;
	offset?: number;
	searchable?: boolean;
	searchPlaceholder?: string;
	emptyMessage?: string;
	className?: string;
};
