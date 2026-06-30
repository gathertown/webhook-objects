/**
 * GitHub side of gh-prs-inbox: fetch the PRs awaiting your review via the `gh`
 * CLI and map them to inbox activity entries.
 *
 * @module
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

/** A PR row as returned by `gh search prs --json`. */
export type Pr = {
	number: number;
	title: string;
	url: string;
	updatedAt: string;
	repository: { nameWithOwner: string };
};

/** An inbox activity entry (the `activity.add` payload). */
export type Entry = { id: string; text: string; url: string };

/** Map a PR to a stable, human-readable activity entry. */
export function prToEntry(pr: Pr): Entry {
	const ref = `${pr.repository.nameWithOwner}#${pr.number}`;
	return { id: ref, text: `${ref} — ${pr.title}`, url: pr.url };
}

/**
 * The entries to show in the feed: most-recently-updated first, capped to
 * `limit`. The inbox `activity` feed is a fixed-size ring buffer, so showing
 * more than it retains would silently evict entries; we cap to its size and let
 * the counter report the true total.
 */
export function feedEntries(prs: Pr[], limit: number): Entry[] {
	return [...prs]
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.slice(0, limit)
		.map(prToEntry);
}

/** Ask the `gh` CLI for open PRs that have requested the current user's review. */
export async function fetchPrs(): Promise<Pr[]> {
	const { stdout } = await exec("gh", [
		"search",
		"prs",
		"--review-requested=@me",
		"--state=open",
		// gh defaults to 30; raise to the API max so a large queue isn't truncated.
		"--limit=1000",
		"--json",
		"number,title,url,updatedAt,repository",
	]);
	return JSON.parse(stdout) as Pr[];
}
