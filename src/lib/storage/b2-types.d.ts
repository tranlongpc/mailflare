/** Connection to an S3-compatible bucket: Backblaze B2 or AWS S3. The fields keep their B2 names. */
export type B2Config = {
	keyId: string;
	applicationKey: string;
	bucket: string;
	/** S3-compatible endpoint host without scheme, e.g. s3.us-west-004.backblazeb2.com. */
	endpoint: string;
	/** Signing region, the second label of the endpoint (us-west-004). */
	region: string;
	/** Address the bucket as `endpoint/bucket/key` instead of `bucket.endpoint/key` (MinIO and other self-hosted servers). */
	pathStyle?: boolean;
	/** `bunny` speaks Bunny Storage's own API: `bucket` is the storage zone and `applicationKey` its password. */
	kind?: "s3" | "bunny";
};

/** A Bunny Storage zone: the regional API host, the zone name and its password (the AccessKey header). */
export type BunnyConfig = { endpoint: string; zone: string; password: string };

export type StorageStatus = {
	provider: "custom" | "bunny" | "backblaze" | "s3" | "r2" | "files";
	configured: boolean;
	bucket: string | null;
	endpoint: string | null;
	/** Where the active storage came from: Admin → Storage, B2_* / S3_* variables, or the R2 binding (local files when self-hosted). */
	source?: "settings" | "environment" | "default";
	/** Drive files go from the browser straight to the bucket. */
	directUploads?: boolean;
};

/** The S3-compatible storage saved under Admin → Storage (app_settings.storage_config). */
export type StoredStorageConfig = {
	preset: StoragePreset;
	endpoint: string;
	region: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	pathStyle: boolean;
};

export type StoragePreset = "r2" | "backblaze" | "s3" | "wasabi" | "spaces" | "bunny" | "custom";

export type B2HttpMetadata = { contentType?: string; contentDisposition?: string; cacheControl?: string };

/** The bucket's S3 API, for URLs signed for the browser. */
export type DirectStorage = {
	credentials: { accessKeyId: string; secretAccessKey: string; region: string };
	/** Virtual-hosted bucket host, e.g. mailflare.s3.us-west-004.backblazeb2.com, or the endpoint for path-style. */
	host: string;
	/** `/<bucket>` for path-style addressing, otherwise empty. */
	prefix: string;
};

export type UploadedPart = { partNumber: number; etag: string; size: number };

/** The saved storage as the admin page shows it: everything but the secret. */
export type SavedStorageView = Omit<StoredStorageConfig, "secretAccessKey">;

export type StorageAdminResponse = {
	status: StorageStatus;
	saved: SavedStorageView | null;
	/** A half-finished B2_* / S3_* setup in the environment. */
	warning: string | null;
	test?: { ok: boolean; error?: string; latencyMs: number };
	error?: string;
};
