import { resolveStorage } from "@/lib/storage";
import { getDirectStorage } from "@/lib/storage/direct";
import type { StorageStatus } from "@/lib/storage/b2-types";

/** Which storage is active, where that choice came from, and whether Drive uploads skip the app. Never includes credentials. */
export async function getActiveStorageStatus(env: CloudflareEnv): Promise<StorageStatus> {
	const resolved = await resolveStorage(env);
	return {
		provider: resolved.provider,
		configured: true,
		bucket: resolved.config?.bucket ?? null,
		endpoint: resolved.config?.endpoint ?? null,
		source: resolved.source,
		directUploads: !!(await getDirectStorage(env)),
	};
}
