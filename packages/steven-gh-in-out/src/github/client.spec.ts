import { expect, test, vi } from "vitest";
import {
	cutoffSinceDate,
	PR_CUTOFF_DAYS,
	REVIEW_REQUEST_CUTOFF_DAYS,
	prCreatedSinceDate,
	reviewRequestSinceDate,
} from "./client";

test("cutoffSinceDate returns YYYY-MM-DD", () => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-07-01T12:00:00Z"));

	expect(cutoffSinceDate(7)).toBe("2026-06-24");
	expect(cutoffSinceDate(14)).toBe("2026-06-17");

	vi.useRealTimers();
});

test("PR search cutoffs use expected day windows", () => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-07-01T12:00:00Z"));

	expect(prCreatedSinceDate()).toBe(cutoffSinceDate(PR_CUTOFF_DAYS));
	expect(reviewRequestSinceDate()).toBe(
		cutoffSinceDate(REVIEW_REQUEST_CUTOFF_DAYS),
	);

	vi.useRealTimers();
});
