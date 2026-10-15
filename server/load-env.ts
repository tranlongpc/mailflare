import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads a `.env` file into `process.env` before anything else reads it, using Node's built-in parser
 * (`process.loadEnvFile`, Node 20.12+/21.7+) so there is no dependency. The file is `.env` in the run directory,
 * or `ENV_FILE` when set. Values already in the environment are not overridden, so PM2/shell env still wins.
 * Missing file or an older Node is ignored; variables then come from the real environment as before.
 *
 * Import this FIRST in the entrypoint so later module evaluation (e.g. anything reading `process.env` at load) sees it.
 */
const loadEnvFile = (process as { loadEnvFile?: (path: string) => void }).loadEnvFile;
if (typeof loadEnvFile === "function") {
	const path = resolve(process.env.ENV_FILE ?? ".env");
	if (existsSync(path)) {
		try {
			loadEnvFile(path);
		} catch (error) {
			console.warn(`Could not load env file ${path}:`, error);
		}
	}
}
