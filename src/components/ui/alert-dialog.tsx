"use client";

import { useLanguage } from "@/components/language-provider";
import { Button } from "./button";
import { Dialog } from "./dialog";
import type { AlertDialogProps } from "./alert-dialog-types";

/** A confirmation dialog: cancel and confirm buttons, the confirm one red when `destructive`. */
export function AlertDialog({ confirmLabel, cancelLabel, onConfirm, confirming = false, destructive = false, children, ...props }: AlertDialogProps) {
	const { t } = useLanguage();
	return (
		<Dialog
			{...props}
			danger={destructive}
			footer={
				<>
					<Button variant="outline" disabled={confirming} onClick={() => props.onOpenChange(false)}>
						{cancelLabel ?? t("common.cancel")}
					</Button>
					<Button variant={destructive ? "destructive" : "default"} disabled={confirming} onClick={() => void onConfirm()}>
						{confirmLabel}
					</Button>
				</>
			}
		>
			{children}
		</Dialog>
	);
}
