import { cn } from "@/lib/utils";
import type { TextareaProps } from "./textarea-types";

export function Textarea({ className, variant = "default", ref, ...props }: TextareaProps) {
	return (
		<textarea
			ref={ref}
			data-slot="textarea"
			className={cn(
				variant === "default" && "flex min-h-[80px] w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-neutral-500 focus-visible:outline-none focus-visible:border-blue-600 aria-invalid:border-red-500 disabled:cursor-not-allowed disabled:opacity-50",
				variant === "bare" && "min-w-0 resize-none bg-transparent outline-none placeholder:text-neutral-500",
				className,
			)}
			{...props}
		/>
	);
}
