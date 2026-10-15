import { B2Object, toBuffer } from "@/lib/storage/b2-bucket";
import type { PutOptions, PutValue } from "@/lib/storage/b2-bucket";
import type { B2HttpMetadata, BunnyConfig } from "@/lib/storage/b2-types";

/**
 * The slice of the R2 bucket API the app uses, served by Bunny Storage's own HTTP API (`AccessKey` header, one PUT
 * per file). Bunny keeps no per-object metadata and has no multipart uploads, so:
 * - content type and custom metadata live in a small JSON sidecar under `_mfmeta/`, read alongside the object;
 * - multipart parts are stored under `_mfparts/<uploadId>/` and streamed into the final object on complete.
 * It has no signed URLs either, so Drive uploads to Bunny always go through the app.
 */

const META_PREFIX = "_mfmeta/";
const PARTS_PREFIX = "_mfparts/";

type Metadata = { httpMetadata: B2HttpMetadata; customMetadata: Record<string, string> };
type ListedFile = { ObjectName: string; Length: number; IsDirectory: boolean };

export class BunnyError extends Error {
	constructor(message: string, readonly status: number) {
		super(message);
	}
}

const encodeKey = (key: string) => key.split("/").map((part) => encodeURIComponent(part)).join("/");

function normalizeMetadata(options?: PutOptions): Metadata | null {
	const meta = options?.httpMetadata;
	const http: B2HttpMetadata = meta instanceof Headers
		? { contentType: meta.get("content-type") ?? undefined, contentDisposition: meta.get("content-disposition") ?? undefined, cacheControl: meta.get("cache-control") ?? undefined }
		: { ...meta };
	for (const name of Object.keys(http) as (keyof B2HttpMetadata)[]) if (!http[name]) delete http[name];
	const custom = options?.customMetadata ?? {};
	return Object.keys(http).length || Object.keys(custom).length ? { httpMetadata: http, customMetadata: custom } : null;
}

/** Bytes `offset` to `offset + length` of a stream, for when the server ignored the Range header. */
function sliceStream(body: ReadableStream<Uint8Array>, offset: number, length: number | null): ReadableStream<Uint8Array> {
	const reader = body.getReader();
	let skip = offset;
	let left = length ?? Number.POSITIVE_INFINITY;
	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			for (;;) {
				if (left <= 0) { controller.close(); await reader.cancel().catch(() => undefined); return; }
				const { done, value } = await reader.read();
				if (done) { controller.close(); return; }
				let chunk = value;
				if (skip) {
					if (chunk.byteLength <= skip) { skip -= chunk.byteLength; continue; }
					chunk = chunk.subarray(skip);
					skip = 0;
				}
				if (chunk.byteLength > left) chunk = chunk.subarray(0, left);
				left -= chunk.byteLength;
				controller.enqueue(chunk);
				return;
			}
		},
		cancel(reason) { return reader.cancel(reason); },
	});
}

export class BunnyBucket {
	private readonly base: string;

	constructor(private readonly config: BunnyConfig) {
		this.base = `https://${config.endpoint}/${encodeURIComponent(config.zone)}`;
	}

	private async request(path: string, init: RequestInit & { duplex?: "half" } = {}, allowMissing = false): Promise<Response | null> {
		const headers = new Headers(init.headers);
		headers.set("AccessKey", this.config.password);
		const response = await fetch(`${this.base}/${path}`, { ...init, headers });
		if (response.ok) return response;
		if (allowMissing && response.status === 404) { await response.body?.cancel().catch(() => undefined); return null; }
		const text = await response.text().catch(() => "");
		let message = text;
		try { message = (JSON.parse(text) as { Message?: string }).Message ?? text; } catch { /* plain text */ }
		throw new BunnyError(message || `Bunny Storage request failed (${response.status})`, response.status);
	}

	private async readMetadata(key: string): Promise<Metadata | null> {
		const response = await this.request(encodeKey(`${META_PREFIX}${key}`), {}, true).catch(() => null);
		if (!response) return null;
		try { return (await response.json()) as Metadata; } catch { return null; }
	}

	private async upload(key: string, body: BodyInit, headers: Record<string, string> = {}, duplex = false) {
		await this.request(encodeKey(key), { method: "PUT", body, headers: { "Content-Type": "application/octet-stream", ...headers }, ...(duplex ? { duplex: "half" as const } : {}) });
	}

	async get(key: string, options?: { range?: { offset?: number; length?: number; suffix?: number } }): Promise<B2Object | null> {
		const range = options?.range;
		const headers: Record<string, string> = {};
		if (range) {
			if (range.suffix != null) headers.Range = `bytes=-${range.suffix}`;
			else {
				const start = range.offset ?? 0;
				headers.Range = range.length != null ? `bytes=${start}-${start + range.length - 1}` : `bytes=${start}-`;
			}
		}
		const [response, metadata] = await Promise.all([this.request(encodeKey(key), { headers }, true), this.readMetadata(key)]);
		if (!response) return null;
		const meta = metadata ?? { httpMetadata: { contentType: response.headers.get("content-type") ?? undefined }, customMetadata: {} };
		if (!range || response.status === 206) return new B2Object(key, response, undefined, meta);
		// The whole object came back; cut the requested bytes out of it.
		const size = Number(response.headers.get("content-length") ?? 0);
		const offset = range.suffix != null ? Math.max(size - range.suffix, 0) : range.offset ?? 0;
		const length = range.suffix != null ? size - offset : range.length ?? null;
		const sliced = new Response(sliceStream(response.body as ReadableStream<Uint8Array>, offset, length), { headers: response.headers });
		return new B2Object(key, sliced, size, meta);
	}

	async head(key: string): Promise<B2Object | null> {
		const object = await this.get(key, { range: { offset: 0, length: 1 } });
		await object?.body.cancel().catch(() => undefined);
		return object;
	}

	async put(key: string, value: PutValue, options?: PutOptions): Promise<B2Object> {
		const body = await toBuffer(value);
		const metadata = normalizeMetadata(options);
		await this.upload(key, body);
		if (metadata) await this.upload(`${META_PREFIX}${key}`, JSON.stringify(metadata), { "Content-Type": "application/json" });
		else await this.request(encodeKey(`${META_PREFIX}${key}`), { method: "DELETE" }, true).catch(() => undefined);
		return new B2Object(key, new Response(null), body.byteLength, metadata ?? { httpMetadata: {}, customMetadata: {} });
	}

	async delete(keys: string | string[]): Promise<void> {
		const list = Array.isArray(keys) ? keys : [keys];
		for (let index = 0; index < list.length; index += 10) {
			await Promise.all(list.slice(index, index + 10).flatMap((key) => [
				this.request(encodeKey(key), { method: "DELETE" }, true),
				this.request(encodeKey(`${META_PREFIX}${key}`), { method: "DELETE" }, true).catch(() => null),
			]));
		}
	}

	async list(): Promise<never> {
		throw new Error("BunnyBucket.list is not implemented");
	}

	private async listParts(uploadId: string): Promise<ListedFile[]> {
		const response = await this.request(`${encodeKey(`${PARTS_PREFIX}${uploadId}`)}/`, { headers: { Accept: "application/json" } }, true);
		if (!response) return [];
		return ((await response.json()) as ListedFile[]).filter((file) => !file.IsDirectory);
	}

	/** One PUT whose body is every part in order, so the file is assembled without being held in memory. */
	private async assemble(key: string, uploadId: string, partNumbers: number[]): Promise<number> {
		const listed = new Map((await this.listParts(uploadId)).map((file) => [file.ObjectName, file.Length]));
		const missing = partNumbers.find((part) => !listed.has(String(part)));
		if (missing !== undefined) throw new Error(`Part ${missing} was not uploaded`);
		const total = partNumbers.reduce((sum, part) => sum + listed.get(String(part))!, 0);
		let index = 0;
		let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
		const stream = new ReadableStream<Uint8Array>({
			pull: async (controller) => {
				for (;;) {
					if (!reader) {
						if (index >= partNumbers.length) { controller.close(); return; }
						const response = await this.request(encodeKey(`${PARTS_PREFIX}${uploadId}/${partNumbers[index++]}`));
						reader = (response!.body as ReadableStream<Uint8Array>).getReader();
					}
					const { done, value } = await reader.read();
					if (done) { reader = null; continue; }
					controller.enqueue(value);
					return;
				}
			},
			cancel: (reason) => reader?.cancel(reason),
		});
		// Bunny wants a length up front. Workers sets it through FixedLengthStream; Node through the header.
		const Fixed = (globalThis as { FixedLengthStream?: new (length: number) => TransformStream<Uint8Array, Uint8Array> }).FixedLengthStream;
		if (Fixed) {
			const fixed = new Fixed(total);
			const piping = stream.pipeTo(fixed.writable);
			await Promise.all([this.upload(key, fixed.readable), piping]);
		} else {
			await this.upload(key, stream, { "Content-Length": String(total) }, true);
		}
		return total;
	}

	private async removeParts(uploadId: string) {
		const parts = await this.listParts(uploadId).catch(() => []);
		await Promise.all(parts.map((file) => this.request(encodeKey(`${PARTS_PREFIX}${uploadId}/${file.ObjectName}`), { method: "DELETE" }, true).catch(() => null)));
		await this.request(`${encodeKey(`${PARTS_PREFIX}${uploadId}`)}/`, { method: "DELETE" }, true).catch(() => null);
	}

	async createMultipartUpload(key: string, options?: PutOptions) {
		const uploadId = crypto.randomUUID();
		const metadata = normalizeMetadata(options);
		// Held with the parts until the upload completes, then moved next to the object.
		if (metadata) await this.upload(`${PARTS_PREFIX}${uploadId}/meta.json`, JSON.stringify(metadata), { "Content-Type": "application/json" });
		return this.resumeMultipartUpload(key, uploadId);
	}

	resumeMultipartUpload(key: string, uploadId: string) {
		return {
			key,
			uploadId,
			uploadPart: async (partNumber: number, value: PutValue) => {
				if (!Number.isInteger(partNumber) || partNumber < 1) throw new Error("Invalid part number");
				await this.upload(`${PARTS_PREFIX}${uploadId}/${partNumber}`, await toBuffer(value));
				return { partNumber, etag: `${uploadId}-${partNumber}` };
			},
			abort: async () => { await this.removeParts(uploadId); },
			complete: async (parts: { partNumber: number; etag: string }[]) => {
				const numbers = [...new Set(parts.map((part) => part.partNumber))].sort((a, b) => a - b);
				const metaResponse = await this.request(encodeKey(`${PARTS_PREFIX}${uploadId}/meta.json`), {}, true);
				const metadata = metaResponse ? await metaResponse.text() : null;
				const size = await this.assemble(key, uploadId, numbers);
				if (metadata) await this.upload(`${META_PREFIX}${key}`, metadata, { "Content-Type": "application/json" });
				await this.removeParts(uploadId);
				return new B2Object(key, new Response(null), size, metadata ? JSON.parse(metadata) as Metadata : { httpMetadata: {}, customMetadata: {} });
			},
		};
	}
}

export function openBunnyBucket(config: BunnyConfig): R2Bucket {
	return new BunnyBucket(config) as unknown as R2Bucket;
}
