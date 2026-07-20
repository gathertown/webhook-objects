import type { WebhookObjectClient } from "@gathertown/webhook-object-sdk";
import { publishCounter } from "../publishers/gather-counter";
import { githubPrReviewCountPoll } from "./github-pr-review-count";
import { githubReviewRequestedPrCountPoll } from "./github-review-requested-pr-count";
import type { Poll, PollResult } from "./types";

export type PollEntry = {
	poll: Poll;
	client: WebhookObjectClient;
	publish: (client: WebhookObjectClient, result: PollResult) => Promise<void>;
};

export function createPollEntries(senders: {
	openPrs: WebhookObjectClient;
	reviewRequested: WebhookObjectClient;
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
