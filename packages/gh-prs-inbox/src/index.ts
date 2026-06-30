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
import { ACTIVITY_BUFFER_SIZE, Client } from "@webhook-objects/client/node";
import { feedEntries, fetchPrs } from "./prs";

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

	// Reset once at startup so a previous run's stale feed/counter don't linger;
	// from then on we reconcile incrementally and never wipe the feed mid-poll.
	{
		const timestamp = new Date().toISOString();
		await client.send({ type: "activity.clear", timestamp, data: {} });
		await client.send({ type: "counter.reset", timestamp, data: {} });
	}
	// Ids currently shown on the object. Mutated as each send lands so a partial
	// failure leaves it accurate — the next poll retries only the missing ops.
	const shownIds = new Set<string>();

	// Send one event, isolating its failure: a single bad PR (e.g. a rejected
	// payload) must not abort the rest of the poll or skip the counter update.
	// Returns whether it landed, so the caller only mutates `shownIds` on success.
	const trySend = async (event: Parameters<typeof client.send>[0]) => {
		try {
			await client.send(event);
			return true;
		} catch (err) {
			console.error("send failed:", err instanceof Error ? err.message : err);
			return false;
		}
	};

	const poll = async () => {
		let prs: Awaited<ReturnType<typeof fetchPrs>>;
		try {
			prs = await fetchPrs();
		} catch (err) {
			// No data — keep the existing feed and retry next poll.
			console.error("fetch failed:", err instanceof Error ? err.message : err);
			return;
		}

		// The feed is a ring buffer, so only the most recent entries survive;
		// cap to its size and let the counter report the true total.
		const entries = feedEntries(prs, ACTIVITY_BUFFER_SIZE);
		const currentIds = new Set(entries.map((e) => e.id));
		const timestamp = new Date().toISOString();

		// Remove before add so the ring buffer never evicts a still-shown entry.
		for (const id of [...shownIds]) {
			if (!currentIds.has(id)) {
				if (
					await trySend({ type: "activity.remove", timestamp, data: { id } })
				) {
					shownIds.delete(id);
				}
			}
		}
		for (const entry of entries) {
			if (!shownIds.has(entry.id)) {
				if (await trySend({ type: "activity.add", timestamp, data: entry })) {
					shownIds.add(entry.id);
				}
			}
		}
		await trySend({
			type: "counter.set",
			timestamp,
			data: { count: prs.length },
		});

		console.log(`synced ${prs.length} PR(s) awaiting review`);
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
