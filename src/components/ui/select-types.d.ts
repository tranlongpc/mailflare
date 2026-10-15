import type { FloatingAlign } from "./internal/floating-types";

export type SelectOption = {
	value: string;
	label: string;
	disabled?: boolean;
	/** Consecutive options with the same group sit under one group heading. */
	group?: string;
	lang?: string;
	/** Extra words the search box matches, e.g. an id the label leaves out. */
	searchText?: string;
	/** Quiet detail at the end of the row, e.g. a count. */
	hint?: string;
};

export type SelectProps = {
	options: readonly SelectOption[];
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	onOpenChange?: (open: boolean) => void;
	/** Shown while nothing is selected; also offered as the empty first option. */
	placeholder?: string;
	/** Forces the search box on or off; by default it appears from `searchThreshold` options. */
	searchable?: boolean;
	searchThreshold?: number;
	searchPlaceholder?: string;
	emptyMessage?: string;
	disabled?: boolean;
	/** Blocks form submission while the value is empty, like a native required select. */
	required?: boolean;
	id?: string;
	/** Submits the value with a surrounding form through a hidden input. */
	name?: string;
	/** Classes for the trigger (text, padding). */
	className?: string;
	/** Classes for the bordered wrapper (width, height, border). */
	containerClassName?: string;
	size?: "default" | "sm";
	/** `bare` drops the border, for selects embedded in a sentence or toolbar. */
	variant?: "default" | "bare";
	align?: FloatingAlign;
	title?: string;
	"aria-label"?: string;
	"aria-labelledby"?: string;
	"aria-describedby"?: string;
	"aria-invalid"?: boolean;
};
