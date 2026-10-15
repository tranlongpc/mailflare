import * as React from "react";
import { cn } from "@/lib/utils";
import type { SlotProps } from "./slot-types";

function composeHandlers(first: unknown, second: unknown) {
	if (typeof first !== "function" && typeof second !== "function") return undefined;
	return (event: unknown) => {
		if (typeof first === "function") first(event);
		if (typeof second === "function") second(event);
	};
}

export function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): React.RefCallback<T> {
	return (value) => {
		for (const ref of refs) {
			if (typeof ref === "function") ref(value);
			else if (ref) (ref as React.RefObject<T | null>).current = value;
		}
	};
}

/** Renders its only child with these props merged in: classes join, handlers chain, refs merge. */
export function Slot({ children, className, ref, ...props }: SlotProps) {
	if (!React.isValidElement<Record<string, unknown>>(children)) return null;
	const childProps = children.props;
	const merged: Record<string, unknown> = {
		...props,
		...childProps,
		className: cn(className, typeof childProps.className === "string" ? childProps.className : undefined),
		ref: mergeRefs(ref, childProps.ref as React.Ref<HTMLElement> | undefined),
	};
	for (const key of Object.keys(props)) {
		if (key.startsWith("on")) merged[key] = composeHandlers(childProps[key], props[key as keyof typeof props]);
	}
	return React.cloneElement(children, merged);
}
