#!/usr/bin/env -S npx tsx
/**
 * Poll GitHub for PR metrics and mirror counts to two Gather Smart Object
 * counters — open PRs you authored/are assigned to, and unapproved review
 * requests naming you directly.
 *
 * @module
 */
import { Client } from "@webhook-objects/client/node";
import { loadConfig } from "./config";
import { fetchGitHubLogin } from "./github/client";
import { createPollEntries } from "./polls/registry";
import { runPollCycle } from "./runner";

const config = loadConfig();

const pollEntries = createPollEntries({
	openPrs: new Client(config.gather.openPrs),
	reviewRequested: new Client(config.gather.reviewRequested),
});

const login = await fetchGitHubLogin(config.github.token);
const ctx = { github: { ...config.github, login } };

async function tick() {
	try {
		await runPollCycle(ctx, pollEntries);
	} catch (err) {
		console.error("Poll cycle failed:", err);
	}
}

console.log(
	`Starting gh-prs-ready-need-review as @${login} (poll every ${config.pollIntervalMs / 1000}s)`,
);

let timer: ReturnType<typeof setTimeout>;
const loop = async () => {
	await tick();
	timer = setTimeout(loop, config.pollIntervalMs);
};

process.on("SIGINT", () => {
	clearTimeout(timer);
	console.log("\nStopped.");
	process.exit(0);
});

loop();
