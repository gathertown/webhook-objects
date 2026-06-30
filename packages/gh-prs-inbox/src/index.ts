#!/usr/bin/env -S npx tsx
/**
 * gh-prs-inbox: polls GitHub for PRs awaiting your review and mirrors them into
 * an `inbox` webhook object — one activity entry per PR, plus a counter of how
 * many are waiting.
 *
 * Proof of concept — KISS. Reads PRs via the `gh` CLI (no extra deps).
 *
 * "PRs pending review" is a *live set*: a PR leaves the list once reviewed or
 * merged. So each poll reconciles the feed against the current PRs — adding the
 * newly-pending, removing the gone — rather than wiping and rewriting it. A
 * failed `add`/`remove` thus only desyncs one entry (self-healed next poll)
 * instead of clearing the whole feed.
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

	// Clear once at startup so a previous run's stale entries don't linger; from
	// then on we reconcile incrementally and never wipe the feed mid-poll.
	await client.send({
		type: "activity.clear",
		timestamp: new Date().toISOString(),
		data: {},
	});
	// Ids currently shown on the object. Mutated as each send lands so a partial
	// failure leaves it accurate — the next poll retries only the missing ops.
	const shownIds = new Set<string>();

	const poll = async () => {
		try {
			const entries = (await fetchPrs()).map(prToEntry);
			const currentIds = new Set(entries.map((e) => e.id));
			const timestamp = new Date().toISOString();

			for (const entry of entries) {
				if (!shownIds.has(entry.id)) {
					await client.send({ type: "activity.add", timestamp, data: entry });
					shownIds.add(entry.id);
				}
			}
			for (const id of [...shownIds]) {
				if (!currentIds.has(id)) {
					await client.send({
						type: "activity.remove",
						timestamp,
						data: { id },
					});
					shownIds.delete(id);
				}
			}
			await client.send({
				type: "counter.set",
				timestamp,
				data: { count: entries.length },
			});

			console.log(`synced ${entries.length} PR(s) awaiting review`);
		} catch (err) {
			console.error("poll failed:", err instanceof Error ? err.message : err);
		}
	};

	console.log(`Polling every ${values.interval}s. Ctrl+C to stop.`);
	// Self-scheduling loop (not setInterval) so a slow poll can never let the
	// next tick start before this one finishes reconciling.
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
