import type { Client } from "@webhook-objects/client/node";
import type { PollResult } from "../polls/types";

/** Publish a poll count to a Smart Object via counter.set. */
export async function publishCounter(
	client: Client,
	result: PollResult,
): Promise<void> {
	const count = Math.max(0, Math.floor(result.value));
	await client.send({
		type: "counter.set",
		timestamp: new Date().toISOString(),
		data: { count },
	});
}
