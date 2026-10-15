import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { hasAdminAccount } from "@/lib/auth/setup";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth/session";
import { getEnv } from "@/lib/cloudflare";
import { authPageMetadata } from "./(auth)/auth-metadata";
import { LoginClient } from "./(auth)/login/login-client";

export const dynamic = "force-dynamic";

export const generateMetadata = () => authPageMetadata("auth.signIn");

export default async function HomePage() {
	const env = getEnv();
	if (!(await hasAdminAccount(env))) redirect("/setup");
	const cookieStore = await cookies();
	const user = await getUserFromSession(env, cookieStore.get(SESSION_COOKIE)?.value);
	if (user && !user.disabled) redirect("/inbox");

	return (
		<AuthGuard mode="public">
			<LoginClient />
		</AuthGuard>
	);
}
