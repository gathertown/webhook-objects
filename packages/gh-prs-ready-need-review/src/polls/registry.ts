import type { Client } from "@webhook-objects/client/node";
import { publishCounter } from "../publishers/gather-counter";
import { githubPrReviewCountPoll } from "./github-pr-review-count";
import { githubReviewRequestedPrCountPoll } from "./github-review-requested-pr-count";
import type { Poll, PollResult } from "./types";

export type PollEntry = {
	poll: Poll;
	client: Client;
	publish: (client: Client, result: PollResult) => Promise<void>;
};

export function createPollEntries(senders: {
	openPrs: Client;
	reviewRequested: Client;
}): PollEntry[] {
	return [
		{
			poll: githubPrReviewCountPoll,
			client: senders.openPrs,
			publish: publishCounter,
		},
		{
			poll: githubReviewRequestedPrCountPoll,
			client: senders.reviewRequested,
			publish: publishCounter,
		},
	];
}
