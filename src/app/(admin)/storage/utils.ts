import { authFetch } from "@/lib/auth/client";
import type { SavedStorageView, StorageAdminResponse } from "@/lib/storage/b2-types";
import type { StorageForm, StoragePresetOption } from "./types";

export const STORAGE_PRESETS: StoragePresetOption[] = [
	{ id: "r2", label: "Cloudflare R2 (S3 API)", endpointExample: "<account-id>.r2.cloudflarestorage.com", pathStyle: false },
	{ id: "backblaze", label: "Backblaze B2", endpointExample: "s3.us-west-004.backblazeb2.com", pathStyle: false },
	{ id: "s3", label: "Amazon S3", endpointExample: "s3.us-east-1.amazonaws.com", pathStyle: false },
	{ id: "wasabi", label: "Wasabi", endpointExample: "s3.us-east-1.wasabisys.com", pathStyle: false },
	{ id: "spaces", label: "DigitalOcean Spaces", endpointExample: "nyc3.digitaloceanspaces.com", pathStyle: false },
	{ id: "bunny", label: "Bunny Storage", endpointExample: "storage.bunnycdn.com", pathStyle: false },
	{ id: "custom", label: null, endpointExample: "minio.example.com", pathStyle: true },
];

export function storageFormFrom(saved: SavedStorageView | null): StorageForm {
	if (!saved) return { preset: "r2", endpoint: "", region: "", bucket: "", accessKeyId: "", secretAccessKey: "", pathStyle: false };
	return { ...saved, secretAccessKey: "" };
}

async function call(method: string, body?: unknown): Promise<StorageAdminResponse> {
	const response = await authFetch("/api/admin/storage", {
		method,
		cache: "no-store",
		headers: body === undefined ? undefined : { "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const data = (await response.json().catch(() => ({}))) as StorageAdminResponse;
	// A failed test still describes the storage, so the caller shows both.
	if (!response.ok && !data.test) throw new Error(data.error ?? `Request failed (${response.status})`);
	return data;
}

export const loadStorage = () => call("GET");
export const saveStorage = (form: StorageForm) => call("PUT", { ...form, secretAccessKey: form.secretAccessKey || undefined });
export const testActiveStorage = () => call("POST");
export const revertStorage = () => call("DELETE");
