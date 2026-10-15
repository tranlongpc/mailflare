"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleX, Database, RefreshCw } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	applyDatabaseMigrations,
	getApplicationUpdateStatus,
	getMigrationStatus,
	triggerApplicationUpdate,
} from "./admin-update-card-utils";
import type { MigrationStatusResponse, UpdateStatusResponse, UpdateWorkflowResponse } from "./admin-update-card-types";

export function AdminUpdateCard() {
	const { t } = useLanguage();
	const [status, setStatus] = useState<UpdateStatusResponse>();
	const [result, setResult] = useState<UpdateWorkflowResponse>();
	const [error, setError] = useState("");
	const [migrationError, setMigrationError] = useState("");
	const [migrationStatus, setMigrationStatus] = useState<MigrationStatusResponse>();
	const [isChecking, setIsChecking] = useState(true);
	const [isCheckingMigrations, setIsCheckingMigrations] = useState(true);
	const [isPending, setIsPending] = useState(false);
	const [isMigrating, setIsMigrating] = useState(false);

	useEffect(() => {
		let isActive = true;

		getApplicationUpdateStatus()
			.then((updateStatus) => {
				if (isActive) setStatus(updateStatus);
			})
			.catch((statusError) => {
				if (isActive) {
					setError(statusError instanceof Error ? statusError.message : t("update.checkFailed"));
				}
			})
			.finally(() => {
				if (isActive) setIsChecking(false);
			});

		getMigrationStatus()
			.then((databaseStatus) => {
				if (isActive) setMigrationStatus(databaseStatus);
			})
			.catch((statusError) => {
				if (isActive) {
					setMigrationError(statusError instanceof Error ? statusError.message : t("update.migrationCheckFailed"));
				}
			})
			.finally(() => {
				if (isActive) setIsCheckingMigrations(false);
			});

		return () => {
			isActive = false;
		};
	}, []);

	async function handleUpdate() {
		setError("");
		setResult(undefined);
		setIsPending(true);

		try {
			setResult(await triggerApplicationUpdate());
		} catch (updateError) {
			setError(updateError instanceof Error ? updateError.message : t("update.startFailed"));
		} finally {
			setIsPending(false);
		}
	}

	async function handleMigrate() {
		setMigrationError("");
		setIsMigrating(true);
		try {
			setMigrationStatus(await applyDatabaseMigrations());
		} catch (migrationFailure) {
			setMigrationError(
				migrationFailure instanceof Error ? migrationFailure.message : t("update.migrateFailed"),
			);
		} finally {
			setIsMigrating(false);
		}
	}

	return (
		<Card
			icon={<RefreshCw className="h-5 w-5" />}
			title={<span className="text-base">{t("update.title")}</span>}
			description={t("update.description")}
			headerClassName="items-center gap-4"
			contentClassName="space-y-5"
		>
				{isChecking && <Skeleton className="h-20 w-full rounded-2xl" />}

				{!isChecking && status?.configured === false && (
					<div className="space-y-3">
						<p className="text-sm text-neutral-600">
							{status.configuration?.length ? t("update.completeConfig") : t("update.selfHosted")}
						</p>
						{!!status.configuration?.length && (
							<ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100">
								{status.configuration.map((item) => (
									<li key={item.name} className="flex items-center gap-3 px-4 py-3 text-sm">
										{item.configured ? (
											<CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
										) : (
											<CircleX className="h-4 w-4 shrink-0 text-red-600" />
										)}
										<code className="text-xs font-medium text-neutral-800">{item.name}</code>
										<span className={`ml-auto text-xs font-medium ${item.configured ? "text-green-700" : "text-red-600"}`}>
											{item.configured ? t("update.configured") : t("update.missing")}
										</span>
									</li>
								))}
							</ul>
						)}
					</div>
				)}

				{!isChecking && status?.configured && (
					<div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100">
						<div className="flex items-center gap-3 px-4 py-4">
							{status.available ? (
								<RefreshCw className={`h-4 w-4 shrink-0 text-blue-600 ${isPending ? "animate-spin" : ""}`} />
							) : (
								<CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
							)}
							<p className="min-w-0 text-sm text-neutral-700">
								{status.available
									? t("update.available", { target: status.targetVersion, current: status.currentVersion })
									: t("update.upToDate", { current: status.currentVersion })}
							</p>
							{status.available && (
								<Button
									type="button"
									variant="link"
									onClick={handleUpdate}
									disabled={isPending}
									className="ml-auto shrink-0"
								>
									{isPending ? t("update.starting") : t("update.updateButton")}
								</Button>
							)}
						</div>
					</div>
				)}

				{(isCheckingMigrations || migrationStatus) && (
					<div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-100">
						{isCheckingMigrations && (
							<div className="flex items-center gap-3 px-4 py-4">
								<Skeleton className="h-4 w-4 rounded-full" />
								<Skeleton className="h-4 w-44" />
							</div>
						)}

						{!isCheckingMigrations && !!migrationStatus?.pending.length && !migrationStatus.unknown.length && (
							<div className="flex items-center gap-3 px-4 py-4">
								<Database className={`h-4 w-4 shrink-0 text-amber-600 ${isMigrating ? "animate-pulse" : ""}`} />
								<p className="text-sm text-neutral-700">
									{t("update.pendingMigrations", { count: migrationStatus.pending.length })}
								</p>
								<Button
									type="button"
									variant="link"
									onClick={handleMigrate}
									disabled={isMigrating}
									className="ml-auto shrink-0"
								>
									{isMigrating ? t("update.updatingDatabase") : t("update.updateDatabase")}
								</Button>
							</div>
						)}

						{!isCheckingMigrations && !!migrationStatus?.unknown.length && (
							<div className="flex items-center gap-3 px-4 py-4 text-sm text-red-600">
								<CircleX className="h-4 w-4 shrink-0" />
								{t("update.deployMatching")}
							</div>
						)}

						{!isCheckingMigrations && migrationStatus?.ready && (
							<div className="flex items-center gap-3 px-4 py-4">
								<CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
								<p className="text-sm text-neutral-700">{t("update.databaseUpToDate")}</p>
							</div>
						)}
					</div>
				)}

				{result?.ok && (
					<p className="text-sm text-green-700">
						{t("update.started", { repo: result.repository, ref: result.ref })}{" "}
						{result.runUrl && (
							<a className="font-medium underline" href={result.runUrl} target="_blank" rel="noreferrer">
								{t("update.viewWorkflow")}
								<span className="sr-only"> ({t("common.opensInNewTab")})</span>
							</a>
						)}
					</p>
				)}
				{error && <p role="alert" className="text-sm text-red-600">{error}</p>}
				{migrationError && <p role="alert" className="text-sm text-red-600">{migrationError}</p>}
		</Card>
	);
}
