/**
 * @typedef {import("./types.js").PollContext} PollContext
 * @typedef {import("./types.js").PollResult} PollResult
 */

import { listOpenPrsForUser, prCreatedSinceDate } from "../github/client.js"

/**
 * Count open, ready-for-review PRs you opened or are assigned to.
 *
 * @param {PollContext} ctx
 * @returns {Promise<PollResult>}
 */
export async function githubPrReviewCountPoll(ctx) {
  const { owner, repo, token, login } = ctx.github

  const prs = await listOpenPrsForUser(token, { owner, repo, login })

  console.log(
    `[github-pr-review-count] ${prs.length} ready-for-review PR(s) since ${prCreatedSinceDate()} authored by or assigned to @${login}:`,
  )
  if (prs.length === 0) {
    console.log("  (none)")
  } else {
    for (const pr of prs) {
      console.log(`  #${pr.number} ${pr.title}`)
      console.log(`    ${pr.html_url}`)
    }
  }

  return {
    pollId: "github-pr-review-count",
    label: "GitHub PR reviews",
    value: prs.length,
  }
}
