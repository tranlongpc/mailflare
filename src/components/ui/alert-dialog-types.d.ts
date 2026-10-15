import type * as React from "react";
import type { DialogProps } from "./dialog-types";

export type AlertDialogProps = Omit<DialogProps, "footer" | "danger" | "onSubmit" | "children"> & {
	children?: React.ReactNode;
	confirmLabel: React.ReactNode;
	cancelLabel?: React.ReactNode;
	onConfirm: () => void | Promise<void>;
	confirming?: boolean;
	destructive?: boolean;
};
