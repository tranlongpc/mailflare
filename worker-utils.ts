import { runAccountRetention } from "./src/lib/accounts/deletion";
import { processAgentDraftJob } from "./src/lib/agent/jobs/utils";
import { runAgentMaintenance } from "./src/lib/agent/maintenance";
import { runScheduledDatabaseBackup } from "./src/lib/backups/runner";
import { runDriveTrashRetention } from "./src/lib/drive/retention";
import { processInboundMessage, type InboundQueueMessage } from "./src/lib/email/inbound";
import { processOutboundQueue, type OutboundQueueMessage } from "./src/lib/email/send";
import { runTrashRetention } from "./src/lib/email/trash-retention";
import { processWebhookRetry, type WebhookRetryMessage } from "./src/lib/email/webhooks";

type AgentDraftQueueMessage = { kind: "agent.draft"; jobId: string };

function hasKind(payload: unknown, kind: string): payload is { kind: string } {
	return typeof payload === "object" && payload !== null && (payload as { kind?: unknown }).kind === kind;
}

export function isInboundQueueMessage(payload: unknown): payload is InboundQueueMessage {
	return typeof payload === "object" && payload !== null && "rawR2Key" in payload && "from" in payload && "to" in payload;
}

export function isWebhookRetryMessage(payload: unknown): payload is WebhookRetryMessage {
	return hasKind(payload, "webhook.retry") && typeof (payload as { deliveryId?: unknown }).deliveryId === "string";
}

export function isAgentDraftMessage(payload: unknown): payload is AgentDraftQueueMessage {
	return hasKind(payload, "agent.draft") && typeof (payload as { jobId?: unknown }).jobId === "string";
}

export function isScheduledSendMessage(payload: unknown): payload is OutboundQueueMessage {
	return hasKind(payload, "email.scheduled") && typeof (payload as { jobId?: unknown }).jobId === "string";
}

/** The one queue consumer both runtimes use: every queue's messages are routed by shape. Throws on unknown bodies so they retry. */
export async function dispatchQueueMessage(env: CloudflareEnv, body: unknown): Promise<void> {
	if (isInboundQueueMessage(body)) return processInboundMessage(env, body);
	if (isAgentDraftMessage(body)) return processAgentDraftJob(env, body.jobId);
	if (isWebhookRetryMessage(body)) return processWebhookRetry(env, body);
	if (isScheduledSendMessage(body)) return processOutboundQueue(env, body);
	throw new Error("Unknown queue message type");
}

/** Recurring upkeep. `daily` adds the 02:00 UTC jobs: backup, drive trash and account retention. */
export function runMaintenance(env: CloudflareEnv, now: Date, daily: boolean): Promise<unknown>[] {
	const jobs: [string, () => Promise<unknown>][] = [
		["Agent maintenance", () => runAgentMaintenance(env)],
		["Trash retention", () => runTrashRetention(env, now)],
	];
	if (daily) {
		jobs.push(
			["Scheduled backup", () => runScheduledDatabaseBackup(env, now)],
			["Drive trash retention", () => runDriveTrashRetention(env, now)],
			["Account retention", () => runAccountRetention(env, now)],
		);
	}
	return jobs.map(([label, run]) => run().catch((error) => console.error(`${label} failed`, error)));
}
