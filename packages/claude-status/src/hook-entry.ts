/**
 * The command Claude runs on each hook (built to `dist/hook-entry.js`, run by
 * bare `node`). Reads the hook payload on stdin, maps the event to a status,
 * and sends it.
 *
 * Always exits 0 with a capped send: a down/slow receiver must never block the
 * user's session.
 *
 * Usage (written into settings.json by `install-hooks`):
 *   node hook-entry.js --url <url> --secret <whsec_...>
 *
 * @module
 */
import { Client } from "@webhook-objects/client/node";
import { eventToState } from "./hook";

const SEND_TIMEOUT_MS = 3000;

function flag(name: string): string | undefined {
	const i = process.argv.indexOf(`--${name}`);
	return i >= 0 ? process.argv[i + 1] : undefined;
}

async function readStdin(): Promise<string> {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
	return Buffer.concat(chunks).toString("utf8");
}

let event: string | undefined;
try {
	event = JSON.parse(await readStdin()).hook_event_name;
} catch {
	process.exit(0); // malformed payload → do nothing
}

const state = event ? eventToState(event) : undefined;
const url = flag("url");
const secret = flag("secret");

if (state && url && secret) {
	try {
		// Use the global fetch (Node 18+) so undici is never imported.
		const client = new Client({
			url,
			secret,
			fetchImpl: (input, init) => fetch(input, init),
		});
		await client.send(
			{
				type: "status.set",
				timestamp: new Date().toISOString(),
				data: { state },
			},
			{ signal: AbortSignal.timeout(SEND_TIMEOUT_MS) },
		);
	} catch {
		// Best effort only.
	}
}
process.exit(0);
