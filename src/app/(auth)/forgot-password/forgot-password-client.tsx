"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { AuthShell } from "@/components/auth/auth-shell";
import { TurnstileField } from "@/components/auth/turnstile";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "./utils";

export function ForgotPasswordClient() {
	const { t } = useLanguage();
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [turnstileReset, setTurnstileReset] = useState(0);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const result = await requestPasswordReset(new FormData(event.currentTarget));
			if (!result.ok) {
				setError(result.error ?? t("auth.forgot.error"));
				setTurnstileReset((value) => value + 1);
				return;
			}
			setSent(true);
		} catch {
			setError(t("auth.serverUnreachable"));
			setTurnstileReset((value) => value + 1);
		} finally {
			setLoading(false);
		}
	}

	return (
		<AuthShell
			icon={KeyRound}
			title={t("auth.forgot.title")}
			description={
				sent
					? t("auth.forgot.sent")
					: t("auth.forgot.description")
			}
			footer={
				<Link href="/login" className="text-sm text-neutral-500 hover:text-neutral-800">
					{t("auth.backToSignIn")}
				</Link>
			}
		>
			{!sent && (
				<form onSubmit={onSubmit} className="space-y-5">
					<div className="space-y-2">
						<Label htmlFor="email">{t("auth.email")}</Label>
						<Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
					</div>
					{error && <Alert variant="destructive">{error}</Alert>}
					<TurnstileField resetSignal={turnstileReset} />
					<Button type="submit" size="pill" disabled={loading}>
						{loading ? t("auth.sending") : t("auth.sendReset")}
					</Button>
				</form>
			)}
		</AuthShell>
	);
}
