import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

let dir: string;
const realHome = process.env.HOME;
const realConfigDir = process.env.CLAUDE_CONFIG_DIR;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "claude-status-"));
	process.env.HOME = dir; // settings path is built from homedir() at import time
	delete process.env.CLAUDE_CONFIG_DIR; // else it wins over HOME and the test reads the wrong file
	vi.resetModules(); // recompute SETTINGS_PATH against this temp home
});
afterEach(() => {
	process.env.HOME = realHome;
	if (realConfigDir === undefined) delete process.env.CLAUDE_CONFIG_DIR;
	else process.env.CLAUDE_CONFIG_DIR = realConfigDir;
});

const settingsPath = () => join(dir, ".claude", "settings.json");
const readSettings = async () =>
	JSON.parse(await readFile(settingsPath(), "utf8"));

it("install adds a hook to every tracked event; uninstall removes them", async () => {
	const { installHooks, uninstallHooks } = await import("./settings");
	const { HOOK_EVENTS } = await import("./hook");

	await installHooks(
		"CLAUDE_STATUS_HOOK=1 npx tsx idx hook --url u --secret s",
	);
	const after = await readSettings();
	for (const event of HOOK_EVENTS) {
		expect(after.hooks[event][0].hooks[0].command).toContain(
			"CLAUDE_STATUS_HOOK",
		);
	}

	await uninstallHooks();
	expect((await readSettings()).hooks).toEqual({});
});

it("preserves foreign settings and hooks; install is idempotent", async () => {
	const { installHooks } = await import("./settings");
	const { mkdir } = await import("node:fs/promises");
	// seed unrelated settings + a foreign Stop hook
	await mkdir(join(dir, ".claude"), { recursive: true });
	await writeFile(
		settingsPath(),
		JSON.stringify({
			theme: "dark",
			hooks: {
				Stop: [{ hooks: [{ type: "command", command: "other-tool" }] }],
			},
		}),
	);

	await installHooks(
		"CLAUDE_STATUS_HOOK=1 npx tsx idx hook --url u --secret s",
	);
	await installHooks(
		"CLAUDE_STATUS_HOOK=1 npx tsx idx hook --url u --secret s",
	); // twice
	const s = await readSettings();

	expect(s.theme).toBe("dark"); // foreign key untouched
	expect(s.hooks.Stop).toHaveLength(2); // foreign hook + ours, no dupes
	expect(s.hooks.Stop[0].hooks[0].command).toBe("other-tool");
	expect(s.hooks.Stop[1].hooks[0].command).toContain("CLAUDE_STATUS_HOOK");
});
