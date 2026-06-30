/**
 * Install/uninstall claude-status hooks in `~/.claude/settings.json`.
 *
 * The user's existing settings (and other tools' hooks) are preserved: we only
 * touch hook groups whose command contains {@link MARKER}, so install is
 * idempotent and uninstall is surgical.
 *
 * @module
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { HOOK_EVENTS } from "./hook";

// Mirror Claude Code's own resolution so we patch the settings file it reads.
const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
const SETTINGS_PATH = join(CONFIG_DIR, "settings.json");
/**
 * Sentinel prefixed onto every command we write, used to recognize our own
 * entries for idempotent install + surgical uninstall. Path-independent so it
 * survives the package living anywhere.
 */
export const MARKER = "CLAUDE_STATUS_HOOK=1";

type HookGroup = { hooks?: Array<{ type?: string; command?: string }> };
type Settings = { hooks?: Record<string, HookGroup[]> } & Record<
	string,
	unknown
>;

const isOurs = (g: HookGroup) =>
	g.hooks?.some((h) => h.command?.includes(MARKER));

async function read(): Promise<Settings> {
	try {
		return JSON.parse(await readFile(SETTINGS_PATH, "utf8"));
	} catch {
		return {}; // missing or unparseable → start fresh (won't clobber valid JSON)
	}
}

async function write(settings: Settings): Promise<void> {
	await mkdir(dirname(SETTINGS_PATH), { recursive: true });
	await writeFile(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`);
}

/** Register `command` on every tracked event. Returns the settings path. */
export async function installHooks(command: string): Promise<string> {
	const settings = await read();
	settings.hooks ??= {};
	const hooks = settings.hooks;
	for (const event of HOOK_EVENTS) {
		const others = (hooks[event] ?? []).filter((g) => !isOurs(g));
		hooks[event] = [...others, { hooks: [{ type: "command", command }] }];
	}
	await write(settings);
	return SETTINGS_PATH;
}

/** Remove all claude-status hook entries. Returns the settings path. */
export async function uninstallHooks(): Promise<string> {
	const settings = await read();
	const hooks = settings.hooks;
	if (hooks) {
		for (const event of HOOK_EVENTS) {
			if (!hooks[event]) continue;
			const kept = hooks[event].filter((g) => !isOurs(g));
			if (kept.length) hooks[event] = kept;
			else delete hooks[event];
		}
	}
	await write(settings);
	return SETTINGS_PATH;
}
