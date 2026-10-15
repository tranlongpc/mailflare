"use client";

import { useEffect, useState } from "react";
import { ChevronRight, FileText, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { authFetch } from "@/lib/auth/client";
import { textToHtml } from "./rich-text-utils";
import type { ComposeTemplate, TemplateMenuProps } from "./template-types";

const itemClass = "flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left outline-none hover:bg-neutral-100 focus:bg-neutral-100";

export function TemplateMenu({ onApply, onNew }: TemplateMenuProps) {
	const { t } = useLanguage();
	const [templates, setTemplates] = useState<ComposeTemplate[]>([]);

	useEffect(() => {
		void authFetch("/api/templates", { cache: "no-store" })
			.then(async (response) => {
				if (response.ok) setTemplates(((await response.json()) as { templates: ComposeTemplate[] }).templates);
			})
			.catch(() => {});
	}, []);
	async function remove(id: string) {
		const response = await authFetch(`/api/templates/${id}`, { method: "DELETE" });
		if (response.ok) setTemplates((current) => current.filter((template) => template.id !== id));
	}

	return (
		<Popover
			side="right"
			align="start"
			offset={4}
			ariaLabel={t("template.menu")}
			className="flex max-h-80 w-64 flex-col rounded-lg p-1 shadow-lg"
			trigger={
				<Button type="button" variant="unstyled" className={`${itemClass} justify-between data-[state=open]:bg-neutral-100`}>
					<span className="flex items-center"><FileText className="mr-2 h-4 w-4" />{t("template.menu")}</span>
					<ChevronRight className="ml-4 h-4 w-4 text-neutral-400" />
				</Button>
			}
		>
			{({ close }) => (
				<>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{templates.length === 0 && <p className="px-3 py-2 text-xs text-neutral-500">{t("template.none")}</p>}
						{templates.map((template) => (
							<div key={template.id} className="group flex items-center justify-between gap-2 rounded-md hover:bg-neutral-100 focus-within:bg-neutral-100">
								<Button
									type="button"
									variant="unstyled"
									onClick={() => { close(); onApply({ title: template.subject ?? "", html: template.htmlBody ?? textToHtml(template.textBody ?? "") }); }}
									className="min-w-0 flex-1 whitespace-normal break-words px-3 py-2 text-left outline-none"
								>
									{template.subject || t("template.untitled")}
								</Button>
								<Button
									type="button"
									variant="unstyled"
									aria-label={t("template.delete")}
									onClick={() => void remove(template.id)}
									className="mr-2 shrink-0 rounded p-1 text-neutral-400 opacity-0 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</div>
						))}
					</div>
					<div className="my-1 h-px shrink-0 bg-neutral-100" />
					<Button type="button" variant="unstyled" onClick={() => { close(); onNew(); }} className={`${itemClass} text-blue-600`}>
						<Plus className="mr-2 h-4 w-4" />{t("template.new")}
					</Button>
				</>
			)}
		</Popover>
	);
}
