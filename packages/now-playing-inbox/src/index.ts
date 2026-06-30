#!/usr/bin/env -S npx tsx
/**
 * now-playing-inbox: polls macOS now-playing metadata (Spotify / Music) and
 * appends each newly-played track to an `inbox` webhook object's activity feed.
 *
 * Proof of concept — KISS. Mac only; reads via `osascript` (no extra deps).
 *
 * @module
 */
import { parseArgs } from "node:util";
import { Client } from "@webhook-objects/client/node";
import { readNowPlaying } from "./now-playing";

async function main() {
	if (process.platform !== "darwin") {
		console.error("now-playing-inbox only works on macOS.");
		process.exit(1);
	}

	const { values } = parseArgs({
		options: {
			url: { type: "string" },
			secret: { type: "string" },
			interval: { type: "string", default: "5" },
			initialize: { type: "boolean", default: false },
		},
	});
	if (!values.url || !values.secret) {
		console.error(
			"Usage: now-playing-inbox --url <url> --secret <whsec_...> [--interval <seconds>] [--initialize]",
		);
		process.exit(1);
	}

	const client = new Client({ url: values.url, secret: values.secret });
	const intervalMs = Number(values.interval) * 1000;
	let lastId: string | undefined;

	if (values.initialize) {
		const timestamp = new Date().toISOString();
		await client.send({ type: "activity.clear", timestamp, data: {} });
		await client.send({ type: "counter.reset", timestamp, data: {} });
		console.log("Initialized: cleared activity feed and reset counter.");
	}

	const poll = async () => {
		try {
			const track = await readNowPlaying();
			if (!track || track.id === lastId) return;
			const timestamp = new Date().toISOString();
			await client.send({
				type: "activity.add",
				timestamp,
				data: { id: track.id, text: track.text, url: track.url },
			});
			// Mark handled as soon as the entry is recorded: a later failure must
			// not re-add this track (which would duplicate the feed entry).
			lastId = track.id;
			console.log(`+ ${track.text}`);
			// Best-effort counter bump so the inbox renders as filling up; if it
			// fails the feed is still correct (the counter may just lag by one).
			await client.send({ type: "counter.increment", timestamp, data: {} });
		} catch (err) {
			console.error("poll failed:", err instanceof Error ? err.message : err);
		}
	};

	console.log(
		`Watching now-playing every ${values.interval}s. Ctrl+C to stop.`,
	);
	// Self-scheduling loop (not setInterval) so a slow read/send can never let
	// the next tick start mid-flight and emit the same track twice.
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
