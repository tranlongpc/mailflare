import { z } from "zod";
import { getEnv } from "@/lib/cloudflare";
import { requireSessionUser } from "@/lib/api/auth";
import { isPrimaryAdmin } from "@/lib/auth/admin";
import { hasValidSessionMutationOrigin } from "@/lib/auth/origin";
import { describeB2Problem, guessStorageRegion, normalizeStorageEndpoint } from "@/lib/storage/b2-config";
import { openConfiguredBucket } from "@/lib/storage";
import { testBucket, testStorage } from "@/lib/storage/health";
import { clearStorageSettings, readStorageSettings, saveStorageSettings, toBucketConfig } from "@/lib/storage/settings";
import { getActiveStorageStatus } from "@/lib/storage/status";
import type { SavedStorageView, StorageAdminResponse, StoredStorageConfig } from "@/lib/storage/b2-types";

const schema = z.object({
	preset: z.enum(["r2", "backblaze", "s3", "wasabi", "spaces", "bunny", "custom"]),
	endpoint: z.string().trim().min(1).max(260),
	region: z.string().trim().toLowerCase().max(64).regex(/^[a-z0-9-]*$/, "Region may only contain letters, digits and dashes").optional(),
	bucket: z.string().trim().min(3).max(63).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]$/, "Bucket names use letters, digits, dots, dashes and underscores"),
	/** Bunny Storage has none: the zone password is the only key. */
	accessKeyId: z.string().trim().max(256).optional(),
	/** Blank keeps the saved secret, so the form can be edited without pasting it again. */
	secretAccessKey: z.string().trim().max(512).optional(),
	pathStyle: z.boolean().optional(),
});

async function authorize(request: Request, mutation: boolean) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return { env, error: auth.error };
	if (!isPrimaryAdmin(auth.user)) return { env, error: Response.json({ error: "Only the primary administrator can manage storage" }, { status: 403 }) };
	if (mutation && !hasValidSessionMutationOrigin(request)) return { env, error: Response.json({ error: "Invalid origin" }, { status: 403 }) };
	return { env, error: null };
}

const noStore = { "Cache-Control": "no-store" };

function view(stored: StoredStorageConfig | null): SavedStorageView | null {
	if (!stored) return null;
	return { preset: stored.preset, endpoint: stored.endpoint, region: stored.region, bucket: stored.bucket, accessKeyId: stored.accessKeyId, pathStyle: stored.pathStyle };
}

async function describe(env: CloudflareEnv, extra: Partial<StorageAdminResponse> = {}): Promise<StorageAdminResponse> {
	return { status: await getActiveStorageStatus(env), saved: view(await readStorageSettings(env)), warning: describeB2Problem(env), ...extra };
}

export async function GET(request: Request) {
	const access = await authorize(request, false);
	if (access.error) return access.error;
	return Response.json(await describe(access.env), { headers: noStore });
}

/** Tests the bucket with a small write, read and delete, and saves it only if that works. New objects go there from then on. */
export async function PUT(request: Request) {
	const access = await authorize(request, true);
	if (access.error) return access.error;
	const parsed = schema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Fill in the endpoint, bucket and keys" }, { status: 400 });
	const input = parsed.data;
	const bunny = input.preset === "bunny";
	const accessKeyId = bunny ? "" : input.accessKeyId ?? "";
	if (!bunny && !accessKeyId) return Response.json({ error: "Enter the access key ID" }, { status: 400 });
	const endpoint = normalizeStorageEndpoint(input.endpoint);
	if (!endpoint) return Response.json({ error: "Enter the endpoint as a host name, e.g. s3.us-west-004.backblazeb2.com" }, { status: 400 });
	const previous = await readStorageSettings(access.env);
	// A blank secret keeps the saved one, as long as it belongs to the same key (or, for Bunny, the same zone).
	const sameKey = previous?.preset === input.preset && previous.accessKeyId === accessKeyId && (!bunny || (previous.bucket === input.bucket && previous.endpoint === endpoint));
	const secretAccessKey = input.secretAccessKey || (sameKey ? previous.secretAccessKey : "");
	if (!secretAccessKey) return Response.json({ error: bunny ? "Enter the storage zone password" : "Enter the secret access key" }, { status: 400 });
	const config: StoredStorageConfig = {
		preset: input.preset,
		endpoint,
		region: bunny ? "" : input.region || guessStorageRegion(endpoint) || "us-east-1",
		bucket: input.bucket,
		accessKeyId,
		secretAccessKey,
		pathStyle: bunny ? false : input.pathStyle ?? input.preset === "custom",
	};
	const test = await testBucket(openConfiguredBucket(toBucketConfig(config)));
	if (!test.ok) return Response.json({ error: `The bucket did not accept a test object: ${test.error ?? "unknown error"}`, test }, { status: 400 });
	await saveStorageSettings(access.env, config);
	return Response.json(await describe(access.env, { test }), { headers: noStore });
}

/** Round-trips a small object through the active storage. */
export async function POST(request: Request) {
	const access = await authorize(request, true);
	if (access.error) return access.error;
	const test = await testStorage(access.env);
	return Response.json(await describe(access.env, { test }), { status: test.ok ? 200 : 502, headers: noStore });
}

/** Goes back to B2_* / S3_* variables or the R2 binding. Objects already written to the custom bucket stay there. */
export async function DELETE(request: Request) {
	const access = await authorize(request, true);
	if (access.error) return access.error;
	await clearStorageSettings(access.env);
	return Response.json(await describe(access.env), { headers: noStore });
}
