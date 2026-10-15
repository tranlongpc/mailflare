import { getObjectStorageConfig } from "@/lib/storage/b2-config";
import { openB2Bucket } from "@/lib/storage/b2-bucket";
import { openBunnyBucket } from "@/lib/storage/bunny-bucket";
import { readStorageSettings, toBucketConfig } from "@/lib/storage/settings";
import type { B2Config, StorageStatus } from "@/lib/storage/b2-types";

export type ResolvedStorage = {
	source: "settings" | "environment" | "default";
	provider: StorageStatus["provider"];
	/** The S3-compatible bucket in use; null for the R2 binding (local files when self-hosted). */
	config: B2Config | null;
};

/** Admin → Storage first, then B2_* / S3_* variables, then the R2 binding (or local files when self-hosted). */
export async function resolveStorage(env: CloudflareEnv): Promise<ResolvedStorage> {
	const stored = await readStorageSettings(env);
	if (stored) return { source: "settings", provider: stored.preset === "bunny" ? "bunny" : "custom", config: toBucketConfig(stored) };
	const fromEnv = getObjectStorageConfig(env);
	if (fromEnv) return { source: "environment", provider: fromEnv.provider, config: fromEnv };
	return { source: "default", provider: env.MAILFLARE_RUNTIME === "node" ? "files" : "r2", config: null };
}

const buckets = new Map<string, R2Bucket>();

/** The client for a configured bucket: Bunny Storage's own API, or S3 for everything else. */
export function openConfiguredBucket(config: B2Config): R2Bucket {
	return config.kind === "bunny" ? openBunnyBucket({ endpoint: config.endpoint, zone: config.bucket, password: config.applicationKey }) : openB2Bucket(config);
}

function bucketFor(config: B2Config): R2Bucket {
	const id = JSON.stringify([config.kind ?? "s3", config.endpoint, config.bucket, config.region, config.keyId, config.applicationKey, !!config.pathStyle]);
	let bucket = buckets.get(id);
	if (!bucket) { bucket = openConfiguredBucket(config); buckets.set(id, bucket); }
	return bucket;
}

/**
 * `env.BUCKET` as the app sees it. Writes go to the active storage. Reads that miss there fall back to the default
 * bucket, so switching storage does not hide what was stored before the switch, and deletes reach both. Objects
 * on a storage that was active earlier but is neither the current one nor the default are not read: copy them over.
 */
class StorageRouter {
	constructor(private readonly env: CloudflareEnv, private readonly base: R2Bucket | undefined) {}

	private async active(): Promise<R2Bucket> {
		const { config } = await resolveStorage(this.env);
		if (config) return bucketFor(config);
		if (!this.base) throw new Error("No object storage is configured");
		return this.base;
	}

	private async read<T>(call: (bucket: R2Bucket) => Promise<T | null>): Promise<T | null> {
		const bucket = await this.active();
		const found = await call(bucket);
		if (found || !this.base || bucket === this.base) return found;
		return call(this.base);
	}

	get(key: string, options?: R2GetOptions) { return this.read((bucket) => bucket.get(key, options)); }
	head(key: string) { return this.read((bucket) => bucket.head(key)); }
	async put(...args: Parameters<R2Bucket["put"]>) { return (await this.active()).put(...args); }
	async list(options?: R2ListOptions) { return (await this.active()).list(options); }
	async createMultipartUpload(key: string, options?: R2MultipartOptions) { return (await this.active()).createMultipartUpload(key, options); }

	async delete(keys: string | string[]) {
		const bucket = await this.active();
		await bucket.delete(keys);
		if (this.base && bucket !== this.base) await this.base.delete(keys).catch(() => undefined);
	}

	resumeMultipartUpload(key: string, uploadId: string) {
		const upload = async () => (await this.active()).resumeMultipartUpload(key, uploadId);
		return {
			key,
			uploadId,
			uploadPart: async (...args: Parameters<R2MultipartUpload["uploadPart"]>) => (await upload()).uploadPart(...args),
			abort: async () => (await upload()).abort(),
			complete: async (parts: R2UploadedPart[]) => (await upload()).complete(parts),
		};
	}
}

const wrapped = new WeakMap<object, CloudflareEnv>();
const proxies = new WeakSet<object>();

/**
 * Returns env with BUCKET routed to the active storage (see `resolveStorage`). Every caller reads `env.BUCKET`, so
 * this one place decides where objects live. Proxied rather than spread because Worker bindings are not enumerable.
 */
export function withStorage(env: CloudflareEnv): CloudflareEnv {
	if (proxies.has(env)) return env;
	const cached = wrapped.get(env);
	if (cached) return cached;
	const bucket = new StorageRouter(env, Reflect.get(env, "BUCKET") as R2Bucket | undefined) as unknown as R2Bucket;
	const proxy = new Proxy(env, { get: (target, property) => (property === "BUCKET" ? bucket : Reflect.get(target, property)) });
	wrapped.set(env, proxy);
	proxies.add(proxy);
	return proxy;
}
