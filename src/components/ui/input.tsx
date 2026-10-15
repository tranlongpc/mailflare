import { cn } from "@/lib/utils";
import type { InputProps } from "./input-types";

export const inputClassName = "flex h-10 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm shadow-sm shadow-neutral-200/50 placeholder:text-neutral-500 focus-visible:outline-none focus-visible:border-blue-600 aria-invalid:border-red-500 disabled:cursor-not-allowed disabled:opacity-50";

/** Text-like inputs. `variant="bare"` drops the chrome for inputs embedded in another control (chips, inline editors). File, radio and hidden inputs use it too. */
export function Input({ className, variant = "default", ref, ...props }: InputProps) {
	return <input ref={ref} data-slot="input" className={cn(variant === "default" && inputClassName, variant === "bare" && "min-w-0 bg-transparent outline-none placeholder:text-neutral-500 disabled:cursor-not-allowed", className)} {...props} />;
}
