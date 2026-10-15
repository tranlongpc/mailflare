import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { RequestBodyTooLargeError } from "@/lib/http/errors";
import { readJsonBody } from "@/lib/http/request";

/** The one error envelope: `{ error: string }`, which every client shows as-is. */
export function jsonError(message: string, status: number) {
	return NextResponse.json({ error: message }, { status });
}

/** A 400 whose `error` is a readable sentence (never a zod object); `issues` keeps the detail. */
export function validationError(error: ZodError) {
	const issue = error.issues[0];
	const field = issue?.path.join(".");
	const message = issue ? (field ? `${field}: ${issue.message}` : issue.message) : "Invalid request";
	return NextResponse.json({ error: message, issues: error.issues }, { status: 400 });
}

/** Reads a JSON body without ever throwing: malformed JSON is a 400 and an oversized body a 413. */
export async function readJson<T = unknown>(request: Request, maxBytes = 1024 * 1024): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
	try {
		return { data: await readJsonBody<T>(request, maxBytes), error: null };
	} catch (error) {
		if (error instanceof RequestBodyTooLargeError) return { data: null, error: jsonError("Request body is too large", 413) };
		return { data: null, error: jsonError("Request body must be valid JSON", 400) };
	}
}
