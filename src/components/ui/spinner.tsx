import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SpinnerProps } from "./spinner-types";

export function Spinner({ className, label }: SpinnerProps) {
	return <LoaderCircle aria-hidden={label ? undefined : true} aria-label={label} role={label ? "status" : undefined} className={cn("h-4 w-4 animate-spin", className)} />;
}
