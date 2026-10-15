import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const bundleDirectory = mkdtempSync(join(root, "node_modules", "mailflare-origin-"));
await build({
	entryPoints: [join(root, "src/lib/auth/origin.ts")],
	outfile: join(bundleDirectory, "origin.mjs"),
	bundle: true,
	platform: "node",
	format: "esm",
	logLevel: "silent",
});
const { rejectsCrossSiteSessionMutation } = await import(pathToFileURL(join(bundleDirectory, "origin.mjs")).href);
rmSync(bundleDirectory, { recursive: true, force: true });

const app = new URL("https://mail.example.com/api/send");
const gate = ({ method = "POST", url = app, headers = {} } = {}) =>
	rejectsCrossSiteSessionMutation({ method, url, header: (name) => headers[name.toLowerCase()] ?? null });
const cookie = "theme=dark; ep_session=abc";

test("a cookie-authenticated mutation from another site is rejected", () => {
	assert.equal(gate({ headers: { cookie, "sec-fetch-site": "cross-site" } }), true);
	assert.equal(gate({ headers: { cookie, "sec-fetch-site": "same-site" } }), true);
	assert.equal(gate({ headers: { cookie, origin: "https://evil.example" } }), true);
});

test("same-origin requests, safe methods and non-API paths pass", () => {
	assert.equal(gate({ headers: { cookie, "sec-fetch-site": "same-origin" } }), false);
	assert.equal(gate({ headers: { cookie, origin: "https://mail.example.com" } }), false);
	assert.equal(gate({ method: "GET", headers: { cookie, "sec-fetch-site": "cross-site" } }), false);
	assert.equal(gate({ url: new URL("https://mail.example.com/login"), headers: { cookie, "sec-fetch-site": "cross-site" } }), false);
});

test("requests the session cookie does not authenticate are left to the route", () => {
	// Provider webhooks and API-key clients carry no session cookie.
	assert.equal(gate({ url: new URL("https://mail.example.com/api/inbound/resend"), headers: { "sec-fetch-site": "cross-site" } }), false);
	assert.equal(gate({ headers: { cookie, authorization: "Bearer key", "sec-fetch-site": "cross-site" } }), false);
	assert.equal(gate({ headers: { cookie: "ep_session_other=1", "sec-fetch-site": "cross-site" } }), false);
});
