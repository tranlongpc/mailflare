import { authFetch, getAuthHeaders } from "@/lib/auth/client";

const PART_RETRIES = 3;

async function readError(response: Response): Promise<Error> {
	const data = await response.json().catch(() => null) as { error?: string } | null;
	return new Error(data?.error ?? `Upload failed (${response.status})`);
}

// XMLHttpRequest rather than fetch, because only it reports upload progress. Browsers that do not
// compute the length still finish the part; progress then moves once per part. A signed bucket URL carries its
// own authorization, so our session headers are only sent to our own routes.
function putPart(url: string, chunk: Blob, onBytes: (loaded: number) => void, signed = false): Promise<void> {
	return new Promise((resolve, reject) => {
		const request = new XMLHttpRequest();
		request.open("PUT", url);
		if (!signed) getAuthHeaders({ "Content-Type": "application/octet-stream" }).forEach((value, name) => request.setRequestHeader(name, value));
		request.upload.onprogress = (event) => { if (event.lengthComputable) onBytes(event.loaded); };
		request.onload = () => {
			if (request.status >= 200 && request.status < 300) { resolve(); return; }
			let message: string | undefined;
			try { message = (JSON.parse(request.responseText) as { error?: string }).error; } catch { /* not JSON */ }
			reject(new Error(message ?? `Upload failed (${request.status})`));
		};
		request.onerror = () => reject(new Error("Upload failed: network error"));
		request.onabort = () => reject(new Error("Upload cancelled"));
		request.send(chunk);
	});
}

async function signPart(id: string, partNumber: number): Promise<string | null> {
	const response = await authFetch(`/api/drive/upload/${id}?part=${partNumber}`);
	if (!response.ok) return null;
	return ((await response.json()) as { url?: string }).url ?? null;
}

/**
 * Uploads a file in parts. When the storage allows it, each part goes from the browser straight to the bucket on a
 * signed URL, so file bytes never pass through the app. Otherwise, or when the bucket turns the browser away before
 * any part got through (usually a missing CORS rule), parts go to the app as raw request bodies. Not
 * multipart/form-data: the runtime treats every multipart POST as a server action and rejects anything over 1 MB.
 *
 * The server remembers which parts arrived. Interrupted uploads (lost connection, closed tab) are not discarded:
 * picking the same file again, same name, size and modified time, into the same folder continues after the last stored part.
 */
export async function uploadDriveFile(file: File, parentId: string | null, onProgress: (percent: number, resumed: boolean) => void): Promise<void> {
	const start = await authFetch("/api/drive/upload", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream", parentId, fingerprint: String(file.lastModified) }),
	});
	if (!start.ok) throw await readError(start);
	const session = await start.json() as { id?: string; partSize?: number; parts?: number; uploaded?: number[]; resumed?: boolean; complete?: boolean; direct?: boolean };
	if (session.complete) return;
	const { id, partSize, parts } = session as { id: string; partSize: number; parts: number };
	const stored = new Set(session.uploaded ?? []);
	const resumed = !!session.resumed;
	let direct = !!session.direct;
	let directWorked = false;
	const sendPart = async (partNumber: number, chunk: Blob, onBytes: (loaded: number) => void) => {
		if (direct) {
			const url = await signPart(id, partNumber);
			if (url) {
				try {
					await putPart(url, chunk, onBytes, true);
					directWorked = true;
					return;
				} catch (error) {
					if (directWorked) throw error;
				}
			}
			direct = false;
			onBytes(0);
		}
		await putPart(`/api/drive/upload/${id}?part=${partNumber}`, chunk, onBytes);
	};
	const partBytes = (index: number) => Math.max(0, Math.min(partSize, file.size - index * partSize));
	let sent = [...stored].reduce((total, part) => total + partBytes(part - 1), 0);
	// Held at 99% until the server has assembled the parts.
	const report = (bytes: number) => onProgress(file.size ? Math.min(99, Math.floor((bytes / file.size) * 100)) : 99, resumed);
	report(sent);
	for (let index = 0; index < parts; index += 1) {
		if (stored.has(index + 1)) continue;
		const chunk = file.slice(index * partSize, (index + 1) * partSize);
		for (let attempt = 1; ; attempt += 1) {
			try {
				await sendPart(index + 1, chunk, (loaded) => report(sent + loaded));
				break;
			} catch (error) {
				if (attempt >= PART_RETRIES) throw error;
			}
		}
		sent += chunk.size;
		report(sent);
	}
	const finish = await authFetch(`/api/drive/upload/${id}`, { method: "POST" });
	if (!finish.ok) throw await readError(finish);
}
