#!/usr/bin/env -S npx tsx
/**
 * low-battery-switch: polls macOS power state and mirrors "running low" into a
 * `switch` webhook object — on when you're on battery at/below a threshold, off
 * otherwise. A shared "might drop off the call" light in the space.
 *
 * Proof of concept — KISS. Reads power via `pmset` (no extra deps).
 *
 * @module
 */
import { execFile } from "node:child_process";
import { parseArgs, promisify } from "node:util";
import { Client } from "@webhook-objects/client/node";
import { DEFAULT_THRESHOLD, isLowBattery } from "./battery";

const exec = promisify(execFile);

async function main() {
	const { values } = parseArgs({
		options: {
			url: { type: "string" },
			secret: { type: "string" },
			interval: { type: "string", default: "60" },
			threshold: { type: "string", default: String(DEFAULT_THRESHOLD) },
		},
	});
	if (!values.url || !values.secret) {
		console.error(
			"Usage: low-battery-switch --url <url> --secret <whsec_...> [--interval <seconds>] [--threshold <percent>]",
		);
		process.exit(1);
	}

	const client = new Client({ url: values.url, secret: values.secret });
	const intervalMs = Number(values.interval) * 1000;
	const threshold = Number(values.threshold);

	// Only send on change so we're not spamming the receiver every interval.
	// undefined until the first successful read decides the initial state.
	let lastOn: boolean | undefined;

	const poll = async () => {
		let on: boolean;
		try {
			const { stdout } = await exec("pmset", ["-g", "batt"]);
			on = isLowBattery(stdout, threshold);
		} catch (err) {
			// No reading — hold the last state and retry next poll.
			console.error("pmset failed:", err instanceof Error ? err.message : err);
			return;
		}

		if (on === lastOn) return;
		try {
			await client.send({
				type: "switch.set_state",
				timestamp: new Date().toISOString(),
				data: { on },
			});
			lastOn = on;
			console.log(`battery low: ${on}`);
		} catch (err) {
			console.error("send failed:", err instanceof Error ? err.message : err);
		}
	};

	console.log(
		`Polling every ${values.interval}s (threshold ${threshold}%). Ctrl+C to stop.`,
	);
	// Self-scheduling loop (not setInterval) so a slow poll can't overlap.
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
