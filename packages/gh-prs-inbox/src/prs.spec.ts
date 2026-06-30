import { expect, test } from "vitest";
import { feedEntries, type Pr, prToEntry } from "./prs";

const pr = (number: number, updatedAt: string): Pr => ({
	number,
	title: `pr ${number}`,
	url: `https://github.com/acme/repo/pull/${number}`,
	updatedAt,
	repository: { nameWithOwner: "acme/repo" },
});

test("feedEntries: most-recently-updated first, capped to limit", () => {
	const prs = [
		pr(1, "2026-01-01T00:00:00Z"),
		pr(2, "2026-03-01T00:00:00Z"),
		pr(3, "2026-02-01T00:00:00Z"),
	];
	expect(feedEntries(prs, 2).map((e) => e.id)).toEqual([
		"acme/repo#2",
		"acme/repo#3",
	]);
});

test("maps a PR to a referenced, linked entry", () => {
	const entry = prToEntry({
		number: 19322,
		title: "fix: a thing",
		url: "https://github.com/acme/repo/pull/19322",
		repository: { nameWithOwner: "acme/repo" },
	});
	expect(entry).toEqual({
		id: "acme/repo#19322",
		text: "acme/repo#19322 — fix: a thing",
		url: "https://github.com/acme/repo/pull/19322",
	});
});
