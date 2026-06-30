#!/usr/bin/env -S npx tsx
/**
 * gh-prs-inbox: polls GitHub for PRs awaiting your review and mirrors them into
 * an `inbox` webhook object — one activity entry per PR, plus a counter of how
 * many are waiting.
 *
 * Proof of concept — KISS. Reads PRs via the `gh` CLI (no extra deps).
 *
 * Unlike an append-only feed, "PRs pending review" is a *live set*: a PR leaves
 * the list once reviewed or merged. So each poll rewrites the feed wholesale
 * (clear → add all → set count) rather than incrementally appending.
 *
 * @module
 */
import { parseArgs } from "node:util";
import { Client } from "@webhook-objects/client/node";
import { fetchPrs, prToEntry } from "./prs";

async function main() {
	const { values } = parseArgs({
		options: {
			url: { type: "string" },
			secret: { type: "string" },
			interval: { type: "string", default: "60" },
		},
	});
	if (!values.url || !values.secret) {
		console.error(
			"Usage: gh-prs-inbox --url <url> --secret <whsec_...> [--interval <seconds>]",
		);
		process.exit(1);
	}

	const client = new Client({ url: values.url, secret: values.secret });
	const intervalMs = Number(values.interval) * 1000;

	const poll = async () => {
		try {
			const prs = await fetchPrs();
			const timestamp = new Date().toISOString();
			// Rewrite the whole feed so PRs that are no longer pending disappear.
			await client.send({ type: "activity.clear", timestamp, data: {} });
			for (const pr of prs) {
				await client.send({
					type: "activity.add",
					timestamp,
					data: prToEntry(pr),
				});
			}
			await client.send({
				type: "counter.set",
				timestamp,
				data: { count: prs.length },
			});
			console.log(`synced ${prs.length} PR(s) awaiting review`);
		} catch (err) {
			console.error("poll failed:", err instanceof Error ? err.message : err);
		}
	};

	console.log(`Polling every ${values.interval}s. Ctrl+C to stop.`);
	// Self-scheduling loop (not setInterval) so a slow poll can never let the
	// next tick start mid-rewrite and clobber the feed.
	let timer: ReturnType<typeof setTimeout>;
	const tick = async () => {
		await poll();
		timer = setTimeout(tick, intervalMs);
	};
	process.on("SIGINT", () => {
		clearTimeout(timer);
		console.log("\nStopped.");
		process.exit(0);
	});
	tick();
}

main();
