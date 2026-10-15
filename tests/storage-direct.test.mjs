import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = mkdtempSync(join(tmpdir(), "mailflare-direct-"));
after(() => rmSync(outDir, { recursive: true, force: true }));

async function bundle(entry, outfile) {
	await build({ entryPoints: [join(root, entry)], outfile: join(outDir, outfile), bundle: true, platform: "node", format: "esm", target: "node22", logLevel: "silent", alias: { "@": join(root, "src") } });
	return import(pathToFileURL(join(outDir, outfile)).href);
}

const { getDirectStorage, presignUploadPart, listUploadedParts } = await bundle("src/lib/storage/direct.ts", "direct.mjs");

const R2 = { R2_ACCOUNT_ID: "acct", R2_ACCESS_KEY_ID: "rk", R2_SECRET_ACCESS_KEY: "rs", R2_BUCKET: "mail" };

test("getDirectStorage prefers B2/S3, then an R2 token, and never signs for local files", async () => {
	assert.equal(await getDirectStorage({}), null);
	assert.equal(await getDirectStorage({ R2_ACCOUNT_ID: "acct", R2_BUCKET: "mail" }), null);
	assert.deepEqual(await getDirectStorage(R2), { credentials: { accessKeyId: "rk", secretAccessKey: "rs", region: "auto" }, host: "mail.acct.r2.cloudflarestorage.com", prefix: "" });
	assert.equal(await getDirectStorage({ ...R2, MAILFLARE_RUNTIME: "node" }), null);
	const b2 = await getDirectStorage({ ...R2, B2_KEY_ID: "k", B2_APPLICATION_KEY: "s", B2_BUCKET: "b", B2_ENDPOINT: "s3.us-west-004.backblazeb2.com" });
	assert.equal(b2.host, "b.s3.us-west-004.backblazeb2.com");
	assert.equal(b2.credentials.region, "us-west-004");
	const s3 = await getDirectStorage({ S3_BUCKET: "b", S3_REGION: "eu-west-2", S3_ACCESS_KEY_ID: "AK", S3_SECRET_ACCESS_KEY: "sk", MAILFLARE_RUNTIME: "node" });
	assert.equal(s3.host, "b.s3.eu-west-2.amazonaws.com");
});

test("presigned part URLs keep the bucket in the path for path-style storage", async () => {
	const url = new URL(await presignUploadPart({ credentials: { accessKeyId: "k", secretAccessKey: "s", region: "us-east-1" }, host: "minio.example.com:9000", prefix: "/mail" }, "drive/u1/f", "u1", 1));
	assert.equal(url.host, "minio.example.com:9000");
	assert.equal(url.pathname, "/mail/drive/u1/f");
});

test("presignUploadPart signs a PUT for one part of the upload", async () => {
	const url = new URL(await presignUploadPart(await getDirectStorage(R2), "drive/u1/drv 1", "up/load=", 3));
	assert.equal(url.host, "mail.acct.r2.cloudflarestorage.com");
	assert.equal(url.pathname, "/drive/u1/drv%201");
	assert.equal(url.searchParams.get("partNumber"), "3");
	assert.equal(url.searchParams.get("uploadId"), "up/load=");
	assert.equal(url.searchParams.get("X-Amz-Expires"), "3600");
	assert.match(url.searchParams.get("X-Amz-Credential"), /^rk\/\d{8}\/auto\/s3\/aws4_request$/);
	assert.match(url.searchParams.get("X-Amz-Signature"), /^[0-9a-f]{64}$/);
});

test("listUploadedParts follows ListParts pages and strips ETag quotes", async () => {
	const pages = [
		`<ListPartsResult><IsTruncated>true</IsTruncated><NextPartNumberMarker>1</NextPartNumberMarker><Part><PartNumber>1</PartNumber><ETag>&quot;a1&quot;</ETag><Size>5</Size></Part></ListPartsResult>`,
		`<ListPartsResult><IsTruncated>false</IsTruncated><Part><PartNumber>2</PartNumber><ETag>"b2"</ETag><Size>3</Size></Part></ListPartsResult>`,
	];
	const seen = [];
	const origFetch = globalThis.fetch;
	globalThis.fetch = async (input) => {
		const url = new URL(typeof input === "string" ? input : input.href ?? input.url);
		seen.push(url);
		return new Response(pages[seen.length - 1]);
	};
	try {
		const parts = await listUploadedParts(await getDirectStorage(R2), "drive/u1/f", "u1");
		assert.deepEqual(parts, [{ partNumber: 1, etag: "a1", size: 5 }, { partNumber: 2, etag: "b2", size: 3 }]);
		assert.equal(seen[0].searchParams.get("uploadId"), "u1");
		assert.equal(seen[0].searchParams.has("part-number-marker"), false);
		assert.equal(seen[1].searchParams.get("part-number-marker"), "1");
	} finally {
		globalThis.fetch = origFetch;
	}
});
