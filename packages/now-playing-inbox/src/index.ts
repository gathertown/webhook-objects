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
import { createWebhookObjectClient } from "@gathertown/webhook-object-sdk";
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

	const client = createWebhookObjectClient({
		url: values.url,
		secret: values.secret,
	});
	const intervalMs = Number(values.interval) * 1000;
	let lastId: string | undefined;

	if (values.initialize) {
		await client.send("activity.clear");
		await client.send("counter.reset");
		console.log("Initialized: cleared activity feed and reset counter.");
	}

	const poll = async () => {
		try {
			const track = await readNowPlaying();
			if (!track || track.id === lastId) return;
			await client.send("activity.add", {
				id: track.id,
				text: track.text,
				url: track.url,
			});
			// Mark handled as soon as the entry is recorded: a later failure must
			// not re-add this track (which would duplicate the feed entry).
			lastId = track.id;
			console.log(`+ ${track.text}`);
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
