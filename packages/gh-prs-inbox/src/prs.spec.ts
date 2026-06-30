import { expect, test } from "vitest";
import { prToEntry } from "./prs";

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
