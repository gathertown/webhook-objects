import {
	listOpenReviewRequestedPrsForUser,
	reviewRequestSinceDate,
} from "../github/client";
import type { Poll, PollContext, PollResult } from "./types";

/**
 * Open PRs that directly named you as a reviewer, not yet approved by anyone,
 * in the last week.
 */
export const githubReviewRequestedPrCountPoll: Poll = async (
	ctx: PollContext,
): Promise<PollResult> => {
	const { owner, repo, token, login } = ctx.github;

	const prs = await listOpenReviewRequestedPrsForUser(token, {
		owner,
		repo,
		login,
	});

	console.log(
		`[github-review-requested-count] ${prs.length} unapproved direct review request(s) since ${reviewRequestSinceDate()} for @${login}:`,
	);
	if (prs.length === 0) {
		console.log("  (none)");
	} else {
		for (const pr of prs) {
			console.log(`  #${pr.number} ${pr.title}`);
			console.log(`    ${pr.html_url}`);
		}
	}

	return {
		pollId: "github-review-requested-count",
		label: "GitHub unapproved review-requested PRs",
		value: prs.length,
	};
};
