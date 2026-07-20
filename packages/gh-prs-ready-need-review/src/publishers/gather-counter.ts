import type { WebhookObjectClient } from "@gathertown/webhook-object-sdk";
import type { PollResult } from "../polls/types";

/** Publish a poll count to a Smart Object via counter.set. */
export async function publishCounter(
	client: WebhookObjectClient,
	result: PollResult,
): Promise<void> {
	const count = Math.max(0, Math.floor(result.value));
	await client.send("counter.set", { count });
}
