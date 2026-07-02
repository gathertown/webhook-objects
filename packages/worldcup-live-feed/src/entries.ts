/**
 * Pure text/formatting helpers for the worldcup-live-feed `status` object:
 * activity feed entries and the on-map `info.name` summary.
 *
 * @module
 */
import type { Match } from "./football-data";

/** Prefix applied to `info.name` while any match is live. */
export const NAME_PREFIX = "worldcup.town - ";
/** `info.name` value when no match is live. */
export const IDLE_DISPLAY_NAME = "worldcup.town";
/** Stable activity entry id for the idle/next-match message. */
export const IDLE_ENTRY_ID = "idle";

function goals(match: Pick<Match, "score">) {
	return {
		home: match.score.fullTime.home ?? 0,
		away: match.score.fullTime.away ?? 0,
	};
}

/** `🏆 FT: Home 2-1 Away` — a finished match, for a same-day conversion or the daily batch. */
export function resultEntryText(match: Match): string {
	const { home, away } = goals(match);
	return `🏆 FT: ${match.homeTeam.name} ${home}-${away} ${match.awayTeam.name}`;
}

/** `🔴 LIVE: Home 2-1 Away (67')` — a currently in-progress match. */
export function matchEntryText(match: Match): string {
	const { home, away } = goals(match);
	const minuteSuffix = match.minute != null ? ` (${match.minute}')` : "";
	return `🔴 LIVE: ${match.homeTeam.name} ${home}-${away} ${match.awayTeam.name}${minuteSuffix}`;
}

/** `⚽🎉 GOAL! Home — Home 1-0 Away` — appended the moment a goal is detected. */
export function goalEntryText(
	match: Match,
	scoringSide: "home" | "away",
): string {
	const { home, away } = goals(match);
	const scorer =
		scoringSide === "home" ? match.homeTeam.name : match.awayTeam.name;
	return `⚽🎉 GOAL! ${scorer} — ${match.homeTeam.name} ${home}-${away} ${match.awayTeam.name}`;
}

/** On-map `info.name` while one or more matches are live. */
export function liveDisplayName(matches: Match[]): string {
	if (matches.length === 1) {
		const m = matches[0];
		const home = m.homeTeam.tla ?? m.homeTeam.shortName ?? m.homeTeam.name;
		const away = m.awayTeam.tla ?? m.awayTeam.shortName ?? m.awayTeam.name;
		const { home: h, away: a } = goals(m);
		return `${NAME_PREFIX}⚽ ${home} ${h}-${a} ${away}`;
	}
	return `${NAME_PREFIX}⚽ ${matches.length} matches live`;
}

/** `in 2h 15m` / `in 40m` / `starting soon`, relative to `now`. */
export function countdownText(utcDate: string, now = Date.now()): string {
	const diffMs = new Date(utcDate).getTime() - now;
	if (diffMs <= 0) return "starting soon";
	const hours = Math.floor(diffMs / (60 * 60 * 1000));
	const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
	return hours > 0 ? `in ${hours}h ${minutes}m` : `in ${minutes}m`;
}

/** `⏰ Next: ⚽ Home vs Away — in 2h 15m` — shown while idle, if a match is scheduled. */
export function nextMatchEntryText(match: Match, now = Date.now()): string {
	return `⏰ Next: ⚽ ${match.homeTeam.name} vs ${match.awayTeam.name} — ${countdownText(match.utcDate, now)}`;
}

/** Fallback idle message when nothing is live and nothing is scheduled. */
export const NO_MATCHES_TEXT = "No live World Cup matches right now";
