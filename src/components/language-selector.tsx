"use client";

import { useId } from "react";
import { locales, supportedLocales } from "@/lib/i18n/locales";
import { resolveLocale } from "@/lib/i18n/utils";
import { useLanguage } from "./language-provider";
import { Label } from "./ui/label";
import { Select } from "./ui/select";

export function LanguageSelector({ variant = "field" }: { variant?: "field" | "text" }) {
	const id = useId();
	const { locale, setLocale, t } = useLanguage();
	const options = supportedLocales.map((value) => ({ value, label: locales[value].label, lang: value }));

	if (variant === "text") {
		return (
			<Select
				id={id}
				variant="bare"
				aria-label={t("language.label")}
				value={locale}
				onValueChange={(value) => setLocale(resolveLocale(value))}
				options={options}
				containerClassName="rounded-md focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600"
				className="gap-1 py-2 font-medium text-neutral-600 hover:text-neutral-950 [&>svg]:text-current"
			/>
		);
	}

	return (
		<div className="flex flex-col gap-1 px-1">
			<Label htmlFor={id} className="text-xs font-normal leading-normal text-neutral-600">{t("language.label")}</Label>
			<Select id={id} value={locale} onValueChange={(value) => setLocale(resolveLocale(value))} options={options} containerClassName="h-auto min-h-11 w-full border-neutral-300 focus-within:border-neutral-300 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600" className="min-h-11 pl-2 text-neutral-800" />
		</div>
	);
}
