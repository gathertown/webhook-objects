/**
 * @typedef {import("./polls/types.js").PollContext} PollContext
 * @typedef {import("./polls/registry.js").PollEntry} PollEntry
 */

/**
 * Run every registered poll once and publish results to Gather.
 *
 * @param {PollContext} ctx
 * @param {PollEntry[]} pollEntries
 */
export async function runPollCycle(ctx, pollEntries) {
  for (const { poll, publish, send } of pollEntries) {
    const result = await poll(ctx)
    console.log(`[${result.pollId}] ${result.label}: ${result.value}`)
    await publish(send, result)
  }
}
