import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appSettings } from "@/db/schema";
import type { B2Config, StoredStorageConfig } from "@/lib/storage/b2-types";

/**
 * Every object read and write asks which storage is active, so the saved choice is held per isolate for a short
 * while. Another isolate (or the self-hosted server's peers) picks up a change within this window; reads fall back
 * to the default bucket meanwhile, so nothing written in between is lost.
 */
const CACHE_MS = 30_000;
let cache: { value: StoredStorageConfig | null; expires: number } | null = null;

function parse(text: string | null | undefined): StoredStorageConfig | null {
	if (!text) return null;
	try {
		const value = JSON.parse(text) as StoredStorageConfig;
		return value.endpoint && value.bucket && (value.accessKeyId || value.preset === "bunny") && value.secretAccessKey ? value : null;
	} catch { return null; }
}

/** The storage saved under Admin → Storage, or null for the default. */
export async function readStorageSettings(env: CloudflareEnv): Promise<StoredStorageConfig | null> {
	if (cache && cache.expires > Date.now()) return cache.value;
	try {
		const [row] = await getDb(env).select({ storageConfig: appSettings.storageConfig }).from(appSettings).where(eq(appSettings.id, "default")).limit(1);
		cache = { value: parse(row?.storageConfig), expires: Date.now() + CACHE_MS };
		return cache.value;
	} catch {
		// Before the migration that adds the column (or with no database yet) the default storage is used.
		return cache?.value ?? null;
	}
}

export function toBucketConfig(stored: StoredStorageConfig): B2Config {
	return { keyId: stored.accessKeyId, applicationKey: stored.secretAccessKey, bucket: stored.bucket, endpoint: stored.endpoint, region: stored.region, pathStyle: stored.pathStyle, kind: stored.preset === "bunny" ? "bunny" : "s3" };
}

export async function saveStorageSettings(env: CloudflareEnv, config: StoredStorageConfig): Promise<void> {
	const values = { storageConfig: JSON.stringify(config), updatedAt: new Date() };
	await getDb(env).insert(appSettings).values({ id: "default", ...values }).onConflictDoUpdate({ target: appSettings.id, set: values });
	cache = { value: config, expires: Date.now() + CACHE_MS };
}

export async function clearStorageSettings(env: CloudflareEnv): Promise<void> {
	await getDb(env).update(appSettings).set({ storageConfig: null, updatedAt: new Date() }).where(eq(appSettings.id, "default"));
	cache = { value: null, expires: Date.now() + CACHE_MS };
}
