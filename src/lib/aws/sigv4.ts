import type { AwsCredentials } from "@/lib/aws/aws-types";

const encoder = new TextEncoder();

function hex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(data: string | ArrayBuffer | Uint8Array): Promise<string> {
	const bytes = typeof data === "string" ? encoder.encode(data) : data;
	return hex(await crypto.subtle.digest("SHA-256", bytes as BufferSource));
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
	const imported = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	return crypto.subtle.sign("HMAC", imported, encoder.encode(data));
}

const rfc3986 = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

async function signString(credentials: AwsCredentials, dateStamp: string, region: string, service: string, stringToSign: string): Promise<string> {
	const kDate = await hmac(encoder.encode(`AWS4${credentials.secretAccessKey}`), dateStamp);
	const kRegion = await hmac(kDate, region);
	const kService = await hmac(kRegion, service);
	const kSigning = await hmac(kService, "aws4_request");
	return hex(await hmac(kSigning, stringToSign));
}

function canonicalQueryString(params: URLSearchParams): string {
	return [...params.entries()]
		.map(([name, value]) => [rfc3986(name), rfc3986(value)] as const)
		.sort(([a, av], [b, bv]) => (a < b ? -1 : a > b ? 1 : av < bv ? -1 : av > bv ? 1 : 0))
		.map(([name, value]) => `${name}=${value}`)
		.join("&");
}

export type SignInput = {
	method: string;
	url: URL;
	headers: Record<string, string>;
	body: string | ArrayBuffer | Uint8Array;
	region: string;
	service: string;
	credentials: AwsCredentials;
	now?: Date;
};

/**
 * AWS Signature Version 4. Returns the headers to send, including Authorization.
 * Web Crypto only, so it runs on Workers and in the Node build alike.
 */
export async function signAwsRequest(input: SignInput): Promise<Record<string, string>> {
	const { method, url, region, service, credentials } = input;
	const amzDate = (input.now ?? new Date()).toISOString().replace(/[:-]|\.\d{3}/g, "");
	const dateStamp = amzDate.slice(0, 8);
	const payloadHash = await sha256Hex(input.body);

	const headers: Record<string, string> = { ...input.headers, host: url.host, "x-amz-date": amzDate };
	if (service === "s3") headers["x-amz-content-sha256"] = payloadHash;
	if (credentials.sessionToken) headers["x-amz-security-token"] = credentials.sessionToken;

	const normalized = Object.entries(headers)
		.map(([name, value]) => [name.toLowerCase(), value.trim().replace(/\s+/g, " ")] as const)
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
	const signedHeaders = normalized.map(([name]) => name).join(";");
	const canonicalHeaders = normalized.map(([name, value]) => `${name}:${value}\n`).join("");

	// S3 signs the path as sent; every other service signs it percent-encoded twice.
	const canonicalPath = service === "s3"
		? url.pathname || "/"
		: (url.pathname || "/").split("/").map((segment) => rfc3986(decodeURIComponent(segment))).join("/");
	const canonicalQuery = canonicalQueryString(url.searchParams);

	const canonicalRequest = [method, canonicalPath, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
	const scope = `${dateStamp}/${region}/${service}/aws4_request`;
	const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");

	const signature = await signString(credentials, dateStamp, region, service, stringToSign);

	return {
		...headers,
		Authorization: `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
	};
}

export type PresignInput = {
	method: string;
	url: URL;
	region: string;
	credentials: AwsCredentials;
	/** Seconds the URL stays valid, at most 604800 (seven days). */
	expiresIn: number;
	now?: Date;
};

/**
 * An S3 URL signed in its query string, so a browser can send the request without our credentials.
 * Only `host` is signed and the payload is unsigned: the caller checks what arrived (sizes, parts) afterwards.
 */
export async function presignS3Url(input: PresignInput): Promise<string> {
	const { method, region, credentials } = input;
	const amzDate = (input.now ?? new Date()).toISOString().replace(/[:-]|\.\d{3}/g, "");
	const dateStamp = amzDate.slice(0, 8);
	const scope = `${dateStamp}/${region}/s3/aws4_request`;
	const url = new URL(input.url);
	url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
	url.searchParams.set("X-Amz-Credential", `${credentials.accessKeyId}/${scope}`);
	url.searchParams.set("X-Amz-Date", amzDate);
	url.searchParams.set("X-Amz-Expires", String(input.expiresIn));
	if (credentials.sessionToken) url.searchParams.set("X-Amz-Security-Token", credentials.sessionToken);
	url.searchParams.set("X-Amz-SignedHeaders", "host");

	const canonicalRequest = [method, url.pathname || "/", canonicalQueryString(url.searchParams), `host:${url.host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
	const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");
	url.searchParams.set("X-Amz-Signature", await signString(credentials, dateStamp, region, "s3", stringToSign));
	return url.toString();
}
