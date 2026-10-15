import type { InputProps } from "@/components/ui/input-types";

export type SearchInputProps = Omit<InputProps, "value" | "onChange" | "type"> & {
	value: string;
	onValueChange: (value: string) => void;
	clearLabel?: string;
	containerClassName?: string;
};
