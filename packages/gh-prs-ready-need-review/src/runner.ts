import type { PollContext } from "./polls/types";
import type { PollEntry } from "./polls/registry";

/** Run every registered poll once and publish results to Gather. */
export async function runPollCycle(
	ctx: PollContext,
	pollEntries: PollEntry[],
): Promise<void> {
	for (const { poll, publish, client } of pollEntries) {
		const result = await poll(ctx);
		console.log(`[${result.pollId}] ${result.label}: ${result.value}`);
		await publish(client, result);
	}
}
