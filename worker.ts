import { withStorage } from "./src/lib/storage";
import vinextHandler from "vinext/server/fetch-handler";
import { storeRawToR2, type InboundQueueMessage } from "./src/lib/email/inbound";
import { dispatchQueueMessage, isInboundQueueMessage, runMaintenance } from "./worker-utils";
import { resolveIncomingMail, forwardMessage } from "./src/lib/email/incoming";
import { getUserFromSession } from "./src/lib/auth/session";
import { getSessionTokenFromRequest } from "./src/lib/realtime/utils";
import { inboundAttachmentLimitReasonFromRaw } from "./src/lib/email/inbound-attachments";
import { hasValidSessionMutationOrigin, rejectsCrossSiteSessionMutation } from "./src/lib/auth/origin";
import {
	getAccountForwardingDestination,
	MAILFLARE_FORWARDED_HEADER,
} from "./src/lib/email/account-forwarding";
export { RealtimeHub } from "./src/lib/realtime/hub";

// workerd forbids eval(), so React's dev-only Flight client logs this once per load. It only costs richer server stack traces in dev; production never checks.
if (process.env.NODE_ENV !== "production") {
	const consoleError = console.error.bind(console);
	console.error = (...args: unknown[]) => {
		if (typeof args[0] === "string" && args[0].startsWith("eval() is not supported in this environment.")) return;
		consoleError(...args);
	};
}

export default {
	async fetch(request: Request, rawEnv: CloudflareEnv, ctx: ExecutionContext) {
		const env = withStorage(rawEnv);
		const url = new URL(request.url);
		if (url.pathname === "/api/realtime") {
			if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
				return new Response("Expected WebSocket upgrade", { status: 426 });
			}
			if (!hasValidSessionMutationOrigin(request)) {
				return new Response("Invalid origin", { status: 403 });
			}

			const user = await getUserFromSession(env, getSessionTokenFromRequest(request));
			if (!user || user.disabled) {
				return new Response("Unauthorized", { status: 401 });
			}

			const hub = env.REALTIME.getByName(user.id);
			const hubRequest = new Request("https://mailflare-realtime/connect", request);
			hubRequest.headers.set("X-Mailflare-Realtime-User", user.id);
			return hub.fetch(hubRequest);
		}

		if (rejectsCrossSiteSessionMutation({ method: request.method, url, header: (name) => request.headers.get(name) })) {
			return Response.json({ error: "Cross-site request rejected" }, { status: 403 });
		}

		return vinextHandler.fetch(request, env, ctx);
	},

	async email(message: ForwardableEmailMessage, rawEnv: CloudflareEnv, ctx: ExecutionContext) {
		const env = withStorage(rawEnv);
		try {
			if (message.rawSize > 25 * 1024 * 1024) {
				message.setReject("Message rejected: raw email exceeds the 25 MiB receiving limit. Send a download link instead.");
				return;
			}
			// Domain routing rules are resolved here rather than in the queue because reject and
			// forward can only be actioned on the live ForwardableEmailMessage.
			const decision = await resolveIncomingMail(env, message.from, message.to);

			if (decision?.action === "reject") {
				message.setReject(decision.rejectReason ?? "Message rejected by routing rule");
				return;
			}
			const raw = await new Response(message.raw).arrayBuffer();
			const attachmentLimitReason = await inboundAttachmentLimitReasonFromRaw(raw);
			if (attachmentLimitReason) {
				message.setReject(attachmentLimitReason);
				return;
			}

			if (decision?.action === "forward" && decision.forwardTo) {
				const forwarded = await forwardMessage(message, decision.forwardTo);
				// A forward rule drops the message unless it was explicitly asked to keep a copy.
				// If the forward itself failed we still store it, so mail is never silently lost.
				if (forwarded && !decision.keepCopy) return;
			}

			if (message.headers.get(MAILFLARE_FORWARDED_HEADER) !== "1") {
				const forwardingDestination = await getAccountForwardingDestination(env, message.to);
				if (forwardingDestination) {
					await forwardMessage(message, forwardingDestination);
				}
			}
			const rawR2Key = await storeRawToR2(env, message.from, message.to, raw);
			const payload: InboundQueueMessage = {
				from: message.from,
				to: message.to,
				rawR2Key,
				headers: Object.fromEntries(message.headers),
			};
			await env.INBOUND_QUEUE.send(payload);
		} catch (err) {
			console.error("Inbound enqueue failed", err);
			message.setReject("Processing failed");
		}
	},

	async queue(batch: MessageBatch, rawEnv: CloudflareEnv): Promise<void> {
		const env = withStorage(rawEnv);
		for (const msg of batch.messages) {
			try {
				await dispatchQueueMessage(env, msg.body);
				msg.ack();
			} catch (err) {
				console.error("Queue processing failed", {
					rawR2Key: isInboundQueueMessage(msg.body) ? msg.body.rawR2Key : undefined,
					recipient: isInboundQueueMessage(msg.body) ? msg.body.to : undefined,
					attempts: msg.attempts,
					error: err,
				});
				msg.retry({ delaySeconds: 10 });
			}
		}
	},

	async scheduled(controller: ScheduledController, rawEnv: CloudflareEnv, ctx: ExecutionContext) {
		const env = withStorage(rawEnv);
		// The 02:00 UTC cron adds the daily jobs; the 5-minute cron is queue-like upkeep.
		ctx.waitUntil(Promise.all(runMaintenance(env, new Date(controller.scheduledTime), controller.cron === "0 2 * * *")));
	},
} satisfies ExportedHandler<CloudflareEnv>;
