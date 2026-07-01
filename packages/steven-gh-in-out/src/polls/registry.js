import { githubPrReviewCountPoll } from "./github-pr-review-count.js"
import { githubReviewRequestedPrCountPoll } from "./github-review-requested-pr-count.js"
import { publishCounter } from "../publishers/gather-counter.js"

/** @typedef {import("./types.js").Poll} Poll */
/** @typedef {import("./types.js").PollResult} PollResult */
/** @typedef {ReturnType<import("../gather/sender.js").createSmartObjectSender>} GatherSend */

/**
 * @typedef {object} PollEntry
 * @property {Poll} poll
 * @property {GatherSend} send
 * @property {(send: GatherSend, result: PollResult) => Promise<void>} publish
 */

/**
 * @param {{ openPrs: GatherSend, reviewRequested: GatherSend }} senders
 * @returns {PollEntry[]}
 */
export function createPollEntries(senders) {
  return [
    {
      poll: githubPrReviewCountPoll,
      send: senders.openPrs,
      publish: publishCounter,
    },
    {
      poll: githubReviewRequestedPrCountPoll,
      send: senders.reviewRequested,
      publish: publishCounter,
    },
  ]
}
