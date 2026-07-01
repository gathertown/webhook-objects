/**
 * Publish a poll count to a Smart Object via counter.set.
 *
 * @param {ReturnType<import("../gather/sender.js").createSmartObjectSender>} send
 * @param {import("../polls/types.js").PollResult} result
 */
export async function publishCounter(send, result) {
  const count = Math.max(0, Math.floor(result.value))
  await send("counter.set", { count })
}
