import { Octokit } from "octokit";

export const PR_CUTOFF_DAYS = 14;
export const REVIEW_REQUEST_CUTOFF_DAYS = 7;

export type GitHubPullRequest = {
	id: number;
	number: number;
	title: string;
	html_url: string;
};

function createOctokit(token: string): Octokit {
	return new Octokit({ auth: token });
}

export function cutoffSinceDate(days: number): string {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - days);
	return cutoff.toISOString().slice(0, 10);
}

/** YYYY-MM-DD for GitHub `created:>=` search qualifier */
export function prCreatedSinceDate(): string {
	return cutoffSinceDate(PR_CUTOFF_DAYS);
}

/** YYYY-MM-DD — last week for review-requested PR search */
export function reviewRequestSinceDate(): string {
	return cutoffSinceDate(REVIEW_REQUEST_CUTOFF_DAYS);
}

export async function fetchGitHubLogin(token: string): Promise<string> {
	const octokit = createOctokit(token);
	const { data: user } = await octokit.rest.users.getAuthenticated();
	if (!user.login) {
		throw new Error("GitHub /user response missing login");
	}
	return user.login;
}

export async function searchIssues(
	token: string,
	query: string,
	{ perPage = 100 }: { perPage?: number } = {},
): Promise<GitHubPullRequest[]> {
	const octokit = createOctokit(token);
	const { data } = await octokit.rest.search.issuesAndPullRequests({
		q: query,
		per_page: perPage,
	});
	return (data.items ?? []) as GitHubPullRequest[];
}

/**
 * Open, ready-for-review PRs you opened or are assigned to. Search API rejects
 * OR on user qualifiers, so merge author + assignee results and dedupe.
 */
export async function listOpenPrsForUser(
	token: string,
	{ owner, repo, login }: { owner: string; repo: string; login: string },
): Promise<GitHubPullRequest[]> {
	const createdSince = prCreatedSinceDate();
	const base = `repo:${owner}/${repo} is:pr is:open draft:false created:>=${createdSince}`;
	const [authored, assigned] = await Promise.all([
		searchIssues(token, `${base} author:${login}`),
		searchIssues(token, `${base} assignee:${login}`),
	]);

	const byId = new Map<number, GitHubPullRequest>();
	for (const item of [...authored, ...assigned]) {
		byId.set(item.id, item);
	}

	return [...byId.values()].sort((a, b) => a.number - b.number);
}

/**
 * Open PRs that directly requested you as a reviewer (not via a team), not yet
 * approved by anyone, created in the last week.
 */
export async function listOpenReviewRequestedPrsForUser(
	token: string,
	{ owner, repo, login }: { owner: string; repo: string; login: string },
): Promise<GitHubPullRequest[]> {
	const since = reviewRequestSinceDate();
	const query = `repo:${owner}/${repo} is:pr is:open user-review-requested:${login} -review:approved created:>=${since}`;
	const items = await searchIssues(token, query);
	return items.sort((a, b) => a.number - b.number);
}
