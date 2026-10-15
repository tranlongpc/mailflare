import type * as React from "react";

export type ConfirmOptions = {
	title: React.ReactNode;
	description?: React.ReactNode;
	confirmLabel?: React.ReactNode;
	cancelLabel?: React.ReactNode;
	/** Red confirm button and a warning icon, for deletes and other irreversible actions. */
	destructive?: boolean;
};

/** Resolves true when the user confirms, false when they cancel or dismiss. A string is the title. */
export type ConfirmFunction = (options: ConfirmOptions | string) => Promise<boolean>;
