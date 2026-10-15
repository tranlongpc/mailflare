import { newId } from "@/lib/ids";

export type StorageTestResult = { ok: boolean; error?: string; latencyMs: number };

/** Writes, reads back and deletes a small object, so a wrong key, bucket or endpoint shows up before real mail does. */
export function testStorage(env: CloudflareEnv): Promise<StorageTestResult> {
	return testBucket(env.BUCKET);
}

export async function testBucket(bucket: R2Bucket): Promise<StorageTestResult> {
	const started = Date.now();
	const key = `healthcheck/${newId("chk")}`;
	const payload = `mailflare ${new Date().toISOString()}`;
	try {
		await bucket.put(key, payload, { httpMetadata: { contentType: "text/plain" } });
		const object = await bucket.get(key);
		const text = object ? await object.text() : null;
		await bucket.delete(key);
		if (text !== payload) return { ok: false, error: "Object read back did not match what was written", latencyMs: Date.now() - started };
		return { ok: true, latencyMs: Date.now() - started };
	} catch (error) {
		await bucket.delete(key).catch(() => undefined);
		return { ok: false, error: error instanceof Error ? error.message : "Storage test failed", latencyMs: Date.now() - started };
	}
}
