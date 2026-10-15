"use client";

import { useQuery } from "@tanstack/react-query";
import { LogIn, LogOut } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import {
  fetchActivity,
  formatActivityDate,
  getActivityLabel,
  getActivityMetadata,
} from "./utils";

export default function ActivityPage() {
  const { t } = useLanguage();
  const activity = useQuery({
    queryKey: ["activity"],
    queryFn: fetchActivity,
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("activity.title")} description={t("activity.description")} />

      <section role="region" tabIndex={0} aria-label={t("activity.title")} className="overflow-x-auto rounded-3xl bg-white">
        <Table containerClassName="overflow-visible" className="min-w-[760px] table-fixed text-left text-base">
          <TableHeader className="border-neutral-100 bg-neutral-50 font-semibold uppercase tracking-wide">
            <TableRow>
              <TableHead scope="col" className="w-32 px-5 py-3 font-semibold">{t("activity.col.activity")}</TableHead>
              <TableHead scope="col" className="px-5 py-3 font-semibold">{t("activity.col.user")}</TableHead>
              <TableHead scope="col" className="w-64 px-5 py-3 font-semibold">{t("activity.col.device")}</TableHead>
              <TableHead scope="col" className="w-48 px-5 py-3 font-semibold">{t("activity.col.time")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activity.isLoading &&
              Array.from({ length: 7 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell className="px-5 py-4">
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Skeleton className="h-9 w-48" />
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Skeleton className="h-9 w-40" />
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                </TableRow>
              ))}
            {!activity.isLoading && (activity.data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="px-5 py-4 text-sm text-neutral-500">
                  {t("activity.none")}
                </TableCell>
              </TableRow>
            )}
            {(activity.data ?? []).map((log) => {
              const metadata = getActivityMetadata(log);
              const Icon = log.action === "auth.logout" ? LogOut : LogIn;
              return (
                <TableRow key={log.id} className="align-top hover:bg-neutral-50/70">
                  <TableCell className="px-5 py-4 align-top">
                    <Badge variant="outline" className="gap-1">
                      <Icon className="h-3 w-3" />
                      {getActivityLabel(log.action, t)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4 align-top">
                    <p className="flex flex-col truncate no-font-mono">
                      <span>{log.actorEmail ?? t("activity.unknownEmail")}</span>
                    </p>
                    <small className="text-neutral-500">
                      {metadata.city || t("activity.unknownCity")} •{" "}
                      {metadata.country || t("activity.unknownCountry")}
                    </small>
                  </TableCell>
                  <TableCell className="px-5 py-4 align-top">
                    <p className="flex flex-col truncate no-font-mono">
                      {metadata.device ?? t("activity.unknownDevice")}
                    </p>

                    <small className="text-neutral-500">
                      {metadata.platform || t("activity.unknownPlatform")} •{" "}
                      {metadata.ipAddress ?? t("activity.unknownIp")}
                    </small>
                  </TableCell>
                  <TableCell className="px-5 py-4 align-top text-sm text-neutral-500">
                    {formatActivityDate(log.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
