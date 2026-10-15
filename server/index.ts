import "./load-env";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { parse } from "node:url";
import next from "next";
import { WebSocketServer } from "ws";
import { rejectsCrossSiteSessionMutation } from "@/lib/auth/origin";
import { getUserFromSession } from "@/lib/auth/session";
import { getSessionTokenFromRequest } from "@/lib/realtime/utils";
import { dispatchQueueMessage } from "../worker-utils";
import { createNodeRuntime } from "./runtime/env";
import { applyMigrations } from "./runtime/migrate";
import { startScheduler } from "./runtime/scheduler";
import { startSmtpListener } from "./runtime/smtp";

/**
 * The self-hosted entrypoint: one Node process serving the Next app, the
 * realtime WebSocket, the SMTP listener, the job queues and the backup
 * schedule, the same jobs worker.ts spreads across Cloudflare products.
 */
async function main() {
	const port = Number(process.env.PORT ?? 3000);
	const host = process.env.HOST ?? "0.0.0.0";
	const dev = process.env.NODE_ENV !== "production";
	const runtime = createNodeRuntime();
	const { env } = runtime;
	globalThis.__mailflareNodeEnv = env;

	const migrated = await applyMigrations(runtime.database, resolve(process.env.MIGRATIONS_DIR ?? join(process.cwd(), "drizzle", "migrations")));
	if (migrated.length) console.log(`Applied ${migrated.length} migration(s): ${migrated.join(", ")}`);

	for (const queue of [runtime.inboundQueue, runtime.outboundQueue, runtime.agentQueue]) {
		queue.setConsumer((body) => dispatchQueueMessage(env, body));
	}

	const app = next({ dev, dir: process.cwd(), hostname: host, port });
	const handle = app.getRequestHandler();
	await app.prepare();

	const server = createServer((request, response) => {
		const protocol = String(request.headers["x-forwarded-proto"] ?? "http").split(",")[0].trim();
		const url = new URL(request.url ?? "/", `${protocol}://${request.headers.host ?? "localhost"}`);
		const header = (name: string) => {
			const value = request.headers[name.toLowerCase()];
			return Array.isArray(value) ? value.join(", ") : (value ?? null);
		};
		if (rejectsCrossSiteSessionMutation({ method: request.method ?? "GET", url, header })) {
			response.writeHead(403, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Cross-site request rejected" }));
			return;
		}
		void handle(request, response, parse(request.url ?? "/", true));
	});

	const wss = new WebSocketServer({ noServer: true });
	server.on("upgrade", (request, socket, head) => {
		const { pathname } = parse(request.url ?? "/");
		if (pathname !== "/api/realtime") {
			// Next's own dev-mode HMR socket, or anything else, is not ours.
			if (dev) app.getUpgradeHandler()(request, socket, head);
			else socket.destroy();
			return;
		}
		const cookie = request.headers.cookie ?? "";
		const token = getSessionTokenFromRequest(new Request("http://localhost/", { headers: { cookie } }));
		void getUserFromSession(env, token).then((user) => {
			if (!user || user.disabled) {
				socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
				socket.destroy();
				return;
			}
			wss.handleUpgrade(request, socket, head, (ws) => runtime.realtime.attach(user.id, ws));
		});
	});

	server.listen(port, host, () => {
		console.log(`Mailflare listening on http://${host}:${port} (data in ${runtime.dataDir})`);
	});

	const smtpPort = Number(process.env.SMTP_INBOUND_PORT ?? 25);
	if (smtpPort > 0) {
		startSmtpListener(env, runtime.mailer, {
			port: smtpPort,
			host: process.env.SMTP_INBOUND_HOST,
			maxSize: Number(process.env.SMTP_MAX_SIZE ?? 36 * 1024 * 1024),
			hostname: process.env.MAIL_HOSTNAME,
			tls: process.env.SMTP_TLS_KEY && process.env.SMTP_TLS_CERT ? { keyPath: process.env.SMTP_TLS_KEY, certPath: process.env.SMTP_TLS_CERT } : null,
		});
	}
	const stopScheduler = startScheduler(env);

	const shutdown = () => {
		stopScheduler();
		runtime.inboundQueue.stop();
		runtime.outboundQueue.stop();
		runtime.agentQueue.stop();
		server.close(() => process.exit(0));
		setTimeout(() => process.exit(0), 5000).unref();
	};
	process.on("SIGTERM", shutdown);
	process.on("SIGINT", shutdown);
}

main().catch((error) => {
	console.error("Mailflare failed to start", error);
	process.exit(1);
});
