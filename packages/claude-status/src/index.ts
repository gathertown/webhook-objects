#!/usr/bin/env node

/**
 * claude-status: mirror a Claude Code session's status into a `status` webhook
 * object, driven by Claude's own hooks (no polling).
 *
 * Usage (after `pnpm build`):
 *   claude-status install-hooks --url <url> --secret <whsec_...>
 *   claude-status uninstall-hooks
 *
 * `install-hooks` patches ~/.claude/settings.json so each tracked event runs
 * the built `hook-entry.js` under bare `node`, which maps the event to a status
 * and sends it. Affects sessions started after install. Proof of concept — KISS.
 *
 * @module
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { installHooks, MARKER, uninstallHooks } from "./settings";

function requireCreds() {
	const { values } = parseArgs({
		args: process.argv.slice(3),
		options: { url: { type: "string" }, secret: { type: "string" } },
	});
	if (!values.url || !values.secret) {
		console.error("Missing --url and/or --secret.");
		process.exit(1);
	}
	return { url: values.url, secret: values.secret };
}

async function main() {
	const command = process.argv[2];

	if (command === "install-hooks") {
		const { url, secret } = requireCreds();
		// Absolute node + absolute script: no dependence on the session's cwd,
		// PATH, or a tsx install — those made the hook fail to load.
		const node = process.execPath;
		const entry = join(
			dirname(fileURLToPath(import.meta.url)),
			"hook-entry.js",
		);
		// Single-quote every value so quotes/metacharacters in a URL or secret
		// can't break the shell command Claude stores and runs.
		const shq = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;
		const hookCmd = `${MARKER} ${shq(node)} ${shq(entry)} --url ${shq(url)} --secret ${shq(secret)}`;
		const path = await installHooks(hookCmd);
		console.log(`Installed claude-status hooks in ${path}.`);
		console.log("Takes effect for sessions started from now on.");
		return;
	}

	if (command === "uninstall-hooks") {
		const path = await uninstallHooks();
		console.log(`Removed claude-status hooks from ${path}.`);
		return;
	}

	console.error(
		"Usage:\n" +
			"  claude-status install-hooks --url <url> --secret <whsec_...>\n" +
			"  claude-status uninstall-hooks",
	);
	process.exit(1);
}

main();
