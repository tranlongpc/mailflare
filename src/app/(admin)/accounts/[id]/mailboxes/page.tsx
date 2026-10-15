"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Eye, Plus, Trash2, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormField } from "@/components/ui/form";
import { PageHeader } from "@/components/shared/page-header";
import type { ManagedAccount, ManagedDomain, ManagedMailbox, MailboxSupervisionResponse } from "../types";
import {
  addManagedMailbox,
  fetchMailboxSupervision,
  fetchManagedAccount,
  fetchManagedDomains,
  fetchManagedMailboxes,
  removeManagedMailbox,
  setMailboxSupervisor,
} from "../utils";

export default function AccountMailboxesPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<ManagedAccount | null>(null);
  const [mailboxes, setMailboxes] = useState<ManagedMailbox[]>([]);
  const [domains, setDomains] = useState<ManagedDomain[]>([]);
  const [localPart, setLocalPart] = useState("");
  const [domainId, setDomainId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Null when the signed-in admin is not the primary admin (the API refuses), which hides the section.
  const [supervision, setSupervision] = useState<MailboxSupervisionResponse | null>(null);
  const [supervisorChoice, setSupervisorChoice] = useState<Record<string, string>>({});

  async function loadSupervision() {
    setSupervision(await fetchMailboxSupervision(id).catch(() => null));
  }

  async function changeSupervisor(mailboxId: string, userId: string, enabled: boolean) {
    setMessage(null);
    try {
      await setMailboxSupervisor(mailboxId, userId, enabled);
      if (enabled) setSupervisorChoice((current) => ({ ...current, [mailboxId]: "" }));
      await loadSupervision();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("account.supervision.failed"));
    }
  }

  async function load() {
    const [nextAccount, nextMailboxes, nextDomains] = await Promise.all([
      fetchManagedAccount(id),
      fetchManagedMailboxes(id),
      fetchManagedDomains(),
    ]);
    setAccount(nextAccount);
    setMailboxes(nextMailboxes);
    setDomains(nextDomains);
    setDomainId((current) => current || nextDomains[0]?.id || "");
    await loadSupervision();
  }

  useEffect(() => {
    void load().catch((error) =>
      setMessage(
        error instanceof Error ? error.message : t("account.mailboxes.loadFailed"),
      ),
    );
  }, [id, t]);

  async function addMailbox(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;
    setSaving(true);
    setMessage(null);
    try {
      await addManagedMailbox(account, { domainId, localPart });
      setLocalPart("");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t("account.mailboxes.addFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeMailbox(mailboxId: string) {
    setMessage(null);
    try {
      await removeManagedMailbox(mailboxId);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t("account.mailboxes.removeFailed"),
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("account.mailboxes.title")}
        description={t("account.mailboxes.manage", { name: account?.name ?? t("account.password.thisAccount") })}
      />
      <section className="space-y-4 rounded-3xl bg-white p-6">
        <h2 className="text-base font-semibold text-neutral-900">{t("account.mailboxes.current")}</h2>
        <div className="space-y-2">
          {mailboxes.map((mailbox) => (
            <div
              key={mailbox.id}
              className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {mailbox.displayName || mailbox.localPart}
                </span>
                <span className="block truncate text-sm text-neutral-500">
                  {mailbox.localPart}@{mailbox.hostname}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/mailboxes/${mailbox.id}`} aria-label={`${t("mailbox.title")}: ${mailbox.localPart}@${mailbox.hostname}`}>
                  {t("mailbox.title")}
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void removeMailbox(mailbox.id)}
                aria-label={t("account.mailboxes.removeInbox")}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
              </span>
            </div>
          ))}
          {account && mailboxes.length === 0 && (
            <p className="text-sm text-neutral-500">{t("account.mailboxes.none")}</p>
          )}
        </div>
        {supervision && mailboxes.length > 0 && (
          <div className="space-y-4 border-t border-neutral-200 pt-6">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-neutral-900"><Eye className="h-4 w-4" />{t("account.supervision.title")}</h2>
              <p className="mt-1 text-sm text-neutral-500">{t("account.supervision.description")}</p>
            </div>
            {mailboxes.map((mailbox) => {
              const current = supervision.supervisors.filter((item) => item.mailboxId === mailbox.id);
              const options = supervision.candidates.filter((candidate) => !current.some((item) => item.userId === candidate.id));
              const choice = supervisorChoice[mailbox.id] ?? "";
              return (
                <div key={mailbox.id} className="space-y-3 rounded-2xl bg-neutral-50 px-4 py-3">
                  <p className="truncate text-sm font-medium text-neutral-900">{mailbox.localPart}@{mailbox.hostname}</p>
                  <div className="flex flex-wrap gap-2">
                    {current.length === 0 && <span className="text-sm text-neutral-500">{t("account.supervision.none")}</span>}
                    {current.map((item) => (
                      <span key={item.userId} className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-3 py-1 text-sm text-neutral-800">
                        <span className="truncate">{item.name} ({item.email})</span>
                        <button type="button" className="shrink-0 cursor-pointer rounded-full p-0.5 text-neutral-500 hover:text-red-600" aria-label={t("account.supervision.remove", { name: item.name })} onClick={() => void changeSupervisor(mailbox.id, item.userId, false)}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={choice}
                      onValueChange={(value) => setSupervisorChoice((state) => ({ ...state, [mailbox.id]: value }))}
                      containerClassName="min-w-0 flex-1"
                      className="text-sm"
                      placeholder={t("account.supervision.choose")}
                      options={options.map((candidate) => ({ value: candidate.id, label: `${candidate.name} (${candidate.email})` }))}
                    />
                    <Button type="button" variant="outline" disabled={!choice} onClick={() => void changeSupervisor(mailbox.id, choice, true)}>
                      <Plus className="h-4 w-4" />
                      {t("account.supervision.add")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="border-t border-neutral-200 pt-6">
          <h2 className="text-base font-semibold text-neutral-900">{t("account.mailboxes.addTitle")}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {t("account.mailboxes.addDescription")}
          </p>
          <form onSubmit={addMailbox} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("account.mailboxes.inboxName")} htmlFor="inbox-name" className="min-w-0">
                <Input
                  id="inbox-name"
                  value={localPart}
                  onChange={(event) => setLocalPart(event.target.value)}
                  placeholder={t("account.mailboxes.inboxPlaceholder")}
                  disabled={!account || saving}
                  maxLength={64}
                  required
                />
              </FormField>
              <FormField label={t("account.mailboxes.domain")} htmlFor="inbox-domain" className="min-w-0">
                <Select
                  id="inbox-domain"
                  value={domainId}
                  onValueChange={setDomainId}
                  options={
                    domains.length === 0
                      ? [{ value: "", label: t("account.mailboxes.noDomains") }]
                      : domains.map((domain) => ({ value: domain.id, label: domain.hostname }))
                  }
                  containerClassName="w-full min-w-0"
                  disabled={!account || domains.length === 0 || saving}
                  required
                />
              </FormField>
            </div>
            {domainId && (
              <p className="break-all text-sm text-neutral-500">
                {t("account.mailboxes.address")} <span className="font-medium text-neutral-900">{localPart || t("account.mailboxes.inboxPlaceholder")}@{domains.find((domain) => domain.id === domainId)?.hostname}</span>
              </p>
            )}
            <Button type="submit" disabled={!account || !domainId || !localPart.trim() || saving}>
              <Plus className="h-4 w-4" />
              {saving ? t("account.mailboxes.adding") : t("account.mailboxes.add")}
            </Button>
          </form>
        </div>
      </section>
      {message && <p role="status" className="text-sm text-neutral-500">{message}</p>}
    </div>
  );
}
