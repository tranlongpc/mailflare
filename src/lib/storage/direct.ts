import { awsRequest } from "@/lib/aws/client";
import { presignS3Url } from "@/lib/aws/sigv4";
import { xmlBlocks, xmlTag } from "@/lib/aws/xml";
import { bucketAddress, encodePath } from "@/lib/storage/b2-bucket";
import { resolveStorage } from "@/lib/storage";
import type { DirectStorage, UploadedPart } from "@/lib/storage/b2-types";

/** How long a browser has to send one part after asking for its URL. */
export const DIRECT_UPLOAD_URL_SECONDS = 60 * 60;

/**
 * The active bucket's S3 endpoint, when the browser can be handed signed URLs and send bytes to it without passing
 * through the app. Any S3-compatible storage (Admin → Storage, B2_*, S3_*) qualifies; the R2 binding needs an R2
 * API token (R2_*), since a binding cannot sign URLs. Bunny Storage has no signed URLs, so it never qualifies. Self-hosted with the default storage, files are on local disk
 * and there is nothing to sign for.
 */
export async function getDirectStorage(env: CloudflareEnv): Promise<DirectStorage | null> {
	const { config } = await resolveStorage(env);
	if (config?.kind === "bunny") return null;
	if (config) return { credentials: { accessKeyId: config.keyId, secretAccessKey: config.applicationKey, region: config.region }, ...bucketAddress(config) };
	if (env.MAILFLARE_RUNTIME === "node") return null;
	const accountId = env.R2_ACCOUNT_ID?.trim();
	const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
	const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
	const bucket = env.R2_BUCKET?.trim();
	if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
	return { credentials: { accessKeyId, secretAccessKey, region: "auto" }, host: `${bucket}.${accountId}.r2.cloudflarestorage.com`, prefix: "" };
}

/** A URL the browser PUTs one part of a multipart upload to. */
export function presignUploadPart(storage: DirectStorage, key: string, uploadId: string, partNumber: number): Promise<string> {
	const url = new URL(`https://${storage.host}${storage.prefix}${encodePath(key)}`);
	url.searchParams.set("partNumber", String(partNumber));
	url.searchParams.set("uploadId", uploadId);
	return presignS3Url({ method: "PUT", url, region: storage.credentials.region, credentials: storage.credentials, expiresIn: DIRECT_UPLOAD_URL_SECONDS });
}

/** Parts the bucket holds for an upload (S3 ListParts), which is how parts sent straight from the browser are found. */
export async function listUploadedParts(storage: DirectStorage, key: string, uploadId: string): Promise<UploadedPart[]> {
	const parts: UploadedPart[] = [];
	let marker = "";
	for (;;) {
		const query: Record<string, string> = { uploadId, "max-parts": "1000" };
		if (marker) query["part-number-marker"] = marker;
		const response = await awsRequest({ config: storage.credentials, service: "s3", host: storage.host, path: `${storage.prefix}${encodePath(key)}`, query });
		const xml = await response.text();
		for (const block of xmlBlocks(xml, "Part")) {
			parts.push({ partNumber: Number(xmlTag(block, "PartNumber")), etag: (xmlTag(block, "ETag") ?? "").replace(/"/g, ""), size: Number(xmlTag(block, "Size")) });
		}
		marker = xmlTag(xml, "NextPartNumberMarker") ?? "";
		if (xmlTag(xml, "IsTruncated") !== "true" || !marker) return parts;
	}
}
