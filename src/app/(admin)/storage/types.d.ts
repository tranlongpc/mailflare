import type { StoragePreset } from "@/lib/storage/b2-types";

export interface StorageForm {
	preset: StoragePreset;
	endpoint: string;
	region: string;
	bucket: string;
	accessKeyId: string;
	/** Blank keeps the saved secret. */
	secretAccessKey: string;
	pathStyle: boolean;
}

export interface StoragePresetOption {
	id: StoragePreset;
	/** Shown as is; null for the translated "other S3-compatible" label. */
	label: string | null;
	endpointExample: string;
	pathStyle: boolean;
}
