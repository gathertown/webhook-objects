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
	repository: { nameWithOwner: string };
};

/** An inbox activity entry (the `activity.add` payload). */
export type Entry = { id: string; text: string; url: string };

/** Map a PR to a stable, human-readable activity entry. */
export function prToEntry(pr: Pr): Entry {
	const ref = `${pr.repository.nameWithOwner}#${pr.number}`;
	return { id: ref, text: `${ref} — ${pr.title}`, url: pr.url };
}

/** Ask the `gh` CLI for open PRs that have requested the current user's review. */
export async function fetchPrs(): Promise<Pr[]> {
	const { stdout } = await exec("gh", [
		"search",
		"prs",
		"--review-requested=@me",
		"--state=open",
		"--json",
		"number,title,url,repository",
	]);
	return JSON.parse(stdout) as Pr[];
}
