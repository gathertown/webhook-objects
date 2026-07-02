import { expect, test } from "vitest";
import {
	countdownText,
	goalEntryText,
	liveDisplayName,
	matchEntryText,
	nextMatchEntryText,
	resultEntryText,
} from "./entries";
import type { Match } from "./football-data";

function match(overrides: Partial<Match> = {}): Match {
	return {
		id: 1,
		utcDate: "2026-07-02T20:00:00Z",
		status: "IN_PLAY",
		minute: 67,
		homeTeam: { name: "Spain", tla: "ESP" },
		awayTeam: { name: "Austria", tla: "AUT" },
		score: { fullTime: { home: 2, away: 0 } },
		...overrides,
	};
}

test("resultEntryText formats the final score", () => {
	expect(resultEntryText(match())).toBe("🏆 FT: Spain 2-0 Austria");
});

test("matchEntryText includes the minute when present", () => {
	expect(matchEntryText(match())).toBe("🔴 LIVE: Spain 2-0 Austria (67')");
});

test("matchEntryText omits the minute suffix when absent", () => {
	expect(matchEntryText(match({ minute: null }))).toBe(
		"🔴 LIVE: Spain 2-0 Austria",
	);
});

test("goalEntryText names the scoring side", () => {
	expect(goalEntryText(match(), "home")).toBe(
		"⚽🎉 GOAL! Spain — Spain 2-0 Austria",
	);
	expect(goalEntryText(match(), "away")).toBe(
		"⚽🎉 GOAL! Austria — Spain 2-0 Austria",
	);
});

test("liveDisplayName uses team codes for a single match", () => {
	expect(liveDisplayName([match()])).toBe("worldcup.town - ⚽ ESP 2-0 AUT");
});

test("liveDisplayName falls back to shortName/name when no tla", () => {
	expect(
		liveDisplayName([
			match({
				homeTeam: { name: "United States" },
				awayTeam: { name: "Bosnia-Herzegovina" },
			}),
		]),
	).toBe("worldcup.town - ⚽ United States 2-0 Bosnia-Herzegovina");
});

test("liveDisplayName summarizes multiple live matches", () => {
	expect(liveDisplayName([match(), match({ id: 2 })])).toBe(
		"worldcup.town - ⚽ 2 matches live",
	);
});

test("countdownText reports hours and minutes ahead of now", () => {
	const now = new Date("2026-07-02T18:00:00Z").getTime();
	expect(countdownText("2026-07-02T20:15:00Z", now)).toBe("in 2h 15m");
});

test("countdownText drops the hours segment under an hour", () => {
	const now = new Date("2026-07-02T19:40:00Z").getTime();
	expect(countdownText("2026-07-02T20:00:00Z", now)).toBe("in 20m");
});

test("countdownText reports starting soon once the kickoff has passed", () => {
	const now = new Date("2026-07-02T20:00:01Z").getTime();
	expect(countdownText("2026-07-02T20:00:00Z", now)).toBe("starting soon");
});

test("nextMatchEntryText combines team names and the countdown", () => {
	const now = new Date("2026-07-02T18:00:00Z").getTime();
	expect(
		nextMatchEntryText(match({ utcDate: "2026-07-02T19:00:00Z" }), now),
	).toBe("⏰ Next: ⚽ Spain vs Austria — in 1h 0m");
});
