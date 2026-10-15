import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(join(tmpdir(), "mailflare-bunny-"));
after(() => rmSync(outDir, { recursive: true, force: true }));

async function bundle(entry, outfile) {
	await build({ entryPoints: [join(root, entry)], outfile: join(outDir, outfile), bundle: true, platform: "node", format: "esm", target: "node22", logLevel: "silent", alias: { "@": join(root, "src") } });
	return import(pathToFileURL(join(outDir, outfile)).href);
}

const { BunnyBucket } = await bundle("src/lib/storage/bunny-bucket.ts", "bunny.mjs");

/** A Bunny Storage stand-in: PUT/GET/DELETE files, GET "dir/" lists, DELETE "dir/" removes recursively. */
async function fakeBunny({ honorRange }) {
	const files = new Map();
	const requests = [];
	const server = createServer(async (req, res) => {
		const chunks = [];
		for await (const chunk of req) chunks.push(chunk);
		const body = Buffer.concat(chunks);
		const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
		requests.push({ method: req.method, path, key: req.headers.accesskey, length: req.headers["content-length"], host: req.headers["x-orig-host"] });
		const send = (status, payload = "", headers = {}) => { res.writeHead(status, headers); res.end(payload); };
		if (req.headers.accesskey !== "pw") return send(401, JSON.stringify({ HttpCode: 401, Message: "Unauthorized" }));
		if (!path.startsWith("/zone/")) return send(404);
		const key = path.slice("/zone/".length);
		if (req.method === "PUT") { files.set(key, body); return send(201, JSON.stringify({ HttpCode: 201, Message: "File uploaded." })); }
		if (req.method === "DELETE") {
			const matches = key.endsWith("/") ? [...files.keys()].filter((name) => name.startsWith(key)) : files.has(key) ? [key] : [];
			if (!matches.length) return send(404);
			for (const name of matches) files.delete(name);
			return send(200);
		}
		if (key.endsWith("/")) {
			const listed = [...files.entries()].filter(([name]) => name.startsWith(key) && !name.slice(key.length).includes("/")).map(([name, value]) => ({ ObjectName: name.slice(key.length), Length: value.length, IsDirectory: false }));
			return send(200, JSON.stringify(listed), { "Content-Type": "application/json" });
		}
		const file = files.get(key);
		if (!file) return send(404, JSON.stringify({ HttpCode: 404, Message: "Object Not Found" }));
		const range = /bytes=(\d+)-(\d+)/.exec(req.headers.range ?? "");
		if (range && honorRange) return send(206, file.subarray(Number(range[1]), Number(range[2]) + 1), { "Content-Range": `bytes ${range[1]}-${range[2]}/${file.length}`, "Content-Type": "application/octet-stream" });
		return send(200, file, { "Content-Length": String(file.length), "Content-Type": "application/octet-stream" });
	});
	await new Promise((done) => server.listen(0, "127.0.0.1", done));
	const origFetch = globalThis.fetch;
	globalThis.fetch = (input, init) => {
		const url = new URL(typeof input === "string" ? input : input.href ?? input.url);
		const headers = new Headers(init?.headers);
		headers.set("x-orig-host", url.host);
		return origFetch(new URL(url.pathname + url.search, `http://127.0.0.1:${server.address().port}`), { ...init, headers });
	};
	return { files, requests, close: () => { globalThis.fetch = origFetch; server.close(); } };
}

const config = { endpoint: "uk.storage.bunnycdn.com", zone: "zone", password: "pw" };

test("Bunny Storage: put, get with metadata, ranges, missing objects and delete", async () => {
	for (const honorRange of [true, false]) {
		const bunny = await fakeBunny({ honorRange });
		try {
			const bucket = new BunnyBucket(config);
			await bucket.put("jmap-uploads/b 1", "hello world", { httpMetadata: { contentType: "message/rfc822" }, customMetadata: { name: "a.eml" } });
			assert.equal(bunny.requests[0].host, "uk.storage.bunnycdn.com");
			assert.equal(bunny.requests[0].path, "/zone/jmap-uploads/b 1");
			assert.equal(bunny.requests[0].key, "pw");
			const got = await bucket.get("jmap-uploads/b 1");
			assert.equal(await got.text(), "hello world");
			assert.equal(got.size, 11);
			assert.equal(got.httpMetadata.contentType, "message/rfc822");
			assert.equal(got.customMetadata.name, "a.eml");

			const ranged = await bucket.get("jmap-uploads/b 1", { range: { offset: 6, length: 5 } });
			assert.equal(await ranged.text(), "world", `range with honorRange=${honorRange}`);
			assert.equal(ranged.size, 11);
			assert.equal((await bucket.head("jmap-uploads/b 1")).size, 11);

			assert.equal(await bucket.get("missing"), null);
			await bucket.delete(["jmap-uploads/b 1", "never-existed"]);
			assert.equal(bunny.files.size, 0, "object and its metadata sidecar are gone");
		} finally {
			bunny.close();
		}
	}
});

test("Bunny Storage: multipart parts are joined into one object, with a known length", async () => {
	const bunny = await fakeBunny({ honorRange: true });
	try {
		const bucket = new BunnyBucket(config);
		const upload = await bucket.createMultipartUpload("drive/u1/f", { httpMetadata: { contentType: "video/mp4" } });
		const p2 = await upload.uploadPart(2, new Uint8Array([4, 5]));
		const p1 = await bucket.resumeMultipartUpload("drive/u1/f", upload.uploadId).uploadPart(1, new Uint8Array([1, 2, 3]));
		const done = await bucket.resumeMultipartUpload("drive/u1/f", upload.uploadId).complete([p2, p1]);
		assert.equal(done.size, 5);
		const object = await bucket.get("drive/u1/f");
		assert.deepEqual([...Buffer.from(await object.arrayBuffer())], [1, 2, 3, 4, 5]);
		assert.equal(object.httpMetadata.contentType, "video/mp4");
		assert.equal(bunny.requests.find((request) => request.method === "PUT" && request.path === "/zone/drive/u1/f").length, "5");
		assert.deepEqual([...bunny.files.keys()].filter((name) => name.startsWith("_mfparts/")), [], "parts are removed");

		const aborted = await bucket.createMultipartUpload("drive/u1/g");
		await aborted.uploadPart(1, new Uint8Array([9]));
		await aborted.abort();
		assert.deepEqual([...bunny.files.keys()].filter((name) => name.startsWith("_mfparts/")), []);
		await assert.rejects(bucket.resumeMultipartUpload("drive/u1/h", "nope").complete([{ partNumber: 1, etag: "x" }]), /Part 1 was not uploaded/);
	} finally {
		bunny.close();
	}
});

test("Bunny Storage reports a wrong zone password", async () => {
	const bunny = await fakeBunny({ honorRange: true });
	try {
		await assert.rejects(new BunnyBucket({ ...config, password: "wrong" }).put("x", "y"), /Unauthorized/);
	} finally {
		bunny.close();
	}
});
