import { SESSION_COOKIE } from "./session-cookie";

/** Call only after session authentication. Bearer tokens are not sent automatically by browsers. */
export function hasValidSessionMutationOrigin(request: Request): boolean {
	if (request.headers.get("Authorization")?.startsWith("Bearer ")) return true;
	const fetchSite = request.headers.get("Sec-Fetch-Site");
	if (fetchSite === "same-origin") return true;
	if (fetchSite === "cross-site" || fetchSite === "same-site") return false;
	const origin = request.headers.get("Origin");
	return origin !== null && origin === new URL(request.url).origin;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * The CSRF gate both runtimes apply before any route runs: a state-changing `/api/` request that
 * would be authenticated by the session cookie must come from this origin. Requests without the
 * cookie (provider webhooks, API keys, the app's own Bearer-token fetches) are left to the route.
 */
export function rejectsCrossSiteSessionMutation(input: { method: string; url: URL; header: (name: string) => string | null }): boolean {
	if (SAFE_METHODS.has(input.method.toUpperCase())) return false;
	if (!input.url.pathname.startsWith("/api/")) return false;
	if (input.header("authorization")?.startsWith("Bearer ")) return false;
	const cookies = input.header("cookie") ?? "";
	if (!cookies.split(";").some((part) => part.trim().startsWith(`${SESSION_COOKIE}=`))) return false;
	const fetchSite = input.header("sec-fetch-site");
	if (fetchSite === "same-origin") return false;
	if (fetchSite === "cross-site" || fetchSite === "same-site") return true;
	const origin = input.header("origin");
	return origin !== null && origin !== input.url.origin;
}
