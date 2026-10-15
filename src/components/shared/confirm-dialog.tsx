"use client";

import * as React from "react";
import { useLanguage } from "@/components/language-provider";
import { AlertDialog } from "@/components/ui/alert-dialog";
import type { ConfirmFunction, ConfirmOptions } from "./confirm-dialog-types";

const ConfirmContext = React.createContext<ConfirmFunction | null>(null);

/** Hosts the one confirmation dialog the app shows; `useConfirm()` opens it and resolves with the choice. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
	const { t } = useLanguage();
	const [request, setRequest] = React.useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);

	const confirm = React.useCallback<ConfirmFunction>(
		(options) =>
			new Promise<boolean>((resolve) => {
				setRequest((current) => {
					current?.resolve(false);
					return { ...(typeof options === "string" ? { title: options } : options), resolve };
				});
			}),
		[],
	);

	const settle = (value: boolean) => {
		request?.resolve(value);
		setRequest(null);
	};

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			{request && (
				<AlertDialog
					open
					onOpenChange={(open) => {
						if (!open) settle(false);
					}}
					title={request.title}
					description={request.description}
					confirmLabel={request.confirmLabel ?? t("common.confirm")}
					cancelLabel={request.cancelLabel}
					destructive={request.destructive}
					onConfirm={() => settle(true)}
				/>
			)}
		</ConfirmContext.Provider>
	);
}

/** Returns `confirm(options)`, an awaitable replacement for `window.confirm`. */
export function useConfirm(): ConfirmFunction {
	const confirm = React.useContext(ConfirmContext);
	if (!confirm) throw new Error("useConfirm needs a ConfirmProvider above it");
	return confirm;
}
