import { runMaintenance } from "../../worker-utils";

/** Run the same jobs as the cron triggers in wrangler.jsonc: upkeep every 5 minutes, plus the daily jobs at 02:00 UTC. */
export function startScheduler(env: CloudflareEnv) {
	let lastSlot = "";
	const timer = setInterval(() => {
		const now = new Date();
		if (now.getUTCMinutes() % 5 !== 0) return;
		const slot = now.toISOString().slice(0, 16);
		if (slot === lastSlot) return;
		lastSlot = slot;
		void Promise.all(runMaintenance(env, now, now.getUTCHours() === 2 && now.getUTCMinutes() === 0));
	}, 20_000);
	return () => clearInterval(timer);
}
