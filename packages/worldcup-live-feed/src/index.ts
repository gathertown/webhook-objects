#!/usr/bin/env -S npx tsx
/**
 * worldcup-live-feed: polls football-data.org for World Cup matches and drives
 * a `status` webhook object:
 *   - status: "working" when idle, "on" while any match is live, briefly
 *     "alert" on a goal (reverts to "on" after `--alert-seconds`)
 *   - info.name (on-map, no click needed): an abbreviated summary, e.g.
 *     "worldcup.town - ⚽ ESP 2-0 AUT", or "worldcup.town - ⚽ 3 matches live",
 *     or just "worldcup.town" when idle
 *   - activity feed (popover): "🔴 LIVE: ..." per live match, "⚽🎉 GOAL! ..."
 *     per goal, "⏰ Next: ..." countdown when idle, "🏆 FT: ..." the moment a
 *     match ends (same day) plus a daily batch for the previous day
 *
 * @module
 */
import { parseArgs } from "node:util";
import { createWebhookObjectClient } from "@gathertown/webhook-object-sdk";
import {
	goalEntryText,
	IDLE_DISPLAY_NAME,
	IDLE_ENTRY_ID,
	liveDisplayName,
	matchEntryText,
	NO_MATCHES_TEXT,
	nextMatchEntryText,
	resultEntryText,
} from "./entries";
import {
	fetchLiveMatches,
	fetchResultsForDate,
	fetchUpcomingMatches,
	type Match,
} from "./football-data";

const NEXT_MATCH_REFRESH_MS = 5 * 60 * 1000;

type MatchState = {
	home: number;
	away: number;
	homeTeam: string;
	awayTeam: string;
};

async function main() {
	const { values } = parseArgs({
		options: {
			url: { type: "string" },
			secret: { type: "string" },
			"football-token": { type: "string" },
			interval: { type: "string", default: "30" },
			"alert-seconds": { type: "string", default: "60" },
		},
	});
	const footballToken =
		values["football-token"] ?? process.env.FOOTBALL_DATA_API_TOKEN;
	if (!values.url || !values.secret || !footballToken) {
		console.error(
			"Usage: worldcup-live-feed --url <url> --secret <whsec_...> --football-token <token> [--interval <seconds>] [--alert-seconds <seconds>]\n" +
				"(--football-token can also come from the FOOTBALL_DATA_API_TOKEN env var; get one at https://www.football-data.org)",
		);
		process.exit(1);
	}

	const intervalMs = Number(values.interval) * 1000;
	if (intervalMs < 6_000) {
		console.error(
			"--interval below 6s risks exceeding football-data.org's free-tier 10 req/min limit.",
		);
		process.exit(1);
	}
	const alertMs = Number(values["alert-seconds"]) * 1000;

	const client = createWebhookObjectClient({
		url: values.url,
		secret: values.secret,
	});

	console.log("pinging object...");
	const ping = await client.ping();
	if (ping.preset !== "status") {
		console.error(`Expected a "status" preset object, got "${ping.preset}".`);
		process.exit(1);
	}

	// Seed from the object's actual current entries so a restart doesn't
	// re-dispatch unchanged entries: "at" (the feed's sort key) is server-stamped
	// from dispatch time, so a needless re-dispatch bumps an entry out of its
	// true chronological place relative to genuinely newer ones.
	// The SDK leaves ping capabilities untyped (Record<string, unknown>), so
	// narrow the one slice we read.
	const activityState = ping.capabilities.activity as
		| { entries?: { id: string; text: string }[] }
		| undefined;
	const knownEntryText = new Map(
		(activityState?.entries ?? []).map((e) => [e.id, e.text]),
	);
	const dispatchActivity = async (id: string, text: string) => {
		if (knownEntryText.get(id) === text) return;
		await client.send("activity.add", { id, text });
		knownEntryText.set(id, text);
	};
	const removeActivity = async (id: string) => {
		try {
			await client.send("activity.remove", { id });
			knownEntryText.delete(id);
		} catch {
			// already gone — fine
		}
	};

	let wasLive: boolean | null = null; // null = not yet polled, forces the first tick to sync state
	let lastDisplayName: string | null = null;
	let resultsDate: string | null = null; // last calendar date (YYYY-MM-DD) we fetched previous-day results for
	const lastMatchState = new Map<number, MatchState>();
	let nextMatchCache: Match | null = null;
	let nextMatchFetchedAt = 0;

	const updatePreviousDayResults = async () => {
		const today = new Date().toISOString().slice(0, 10);
		if (resultsDate === today) return;
		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
			.toISOString()
			.slice(0, 10);
		console.log(`fetching previous day's results (${yesterday})...`);
		const matches = await fetchResultsForDate(footballToken, yesterday);
		for (const match of matches) {
			await dispatchActivity(`result-${match.id}`, resultEntryText(match));
		}
		resultsDate = today;
	};

	const getNextMatch = async () => {
		if (Date.now() - nextMatchFetchedAt < NEXT_MATCH_REFRESH_MS) {
			return nextMatchCache;
		}
		console.log("fetching next scheduled match...");
		const upcoming = await fetchUpcomingMatches(footballToken);
		nextMatchCache = upcoming[0] ?? null;
		nextMatchFetchedAt = Date.now();
		return nextMatchCache;
	};

	const poll = async () => {
		try {
			await updatePreviousDayResults();
			console.log("polling football-data.org...");
			const liveMatches = await fetchLiveMatches(footballToken);
			console.log(`found ${liveMatches.length} live match(es)`);
			const live = liveMatches.length > 0;

			// matches present in lastMatchState but no longer live just finished
			const currentIds = new Set(liveMatches.map((m) => m.id));
			for (const [id, state] of lastMatchState) {
				if (currentIds.has(id)) continue;
				console.log(`match ${id} ended -> converting to result entry`);
				await removeActivity(String(id));
				await dispatchActivity(
					`result-${id}`,
					`🏆 FT: ${state.homeTeam} ${state.home}-${state.away} ${state.awayTeam}`,
				);
				lastMatchState.delete(id);
			}

			if (!live) {
				if (wasLive !== false) {
					console.log("no live matches -> showing idle message");
					await client.send("status.set", { state: "working" });
					await client.send("info.set", { name: IDLE_DISPLAY_NAME });
				}
				const nextMatch = await getNextMatch();
				const idleText = nextMatch
					? nextMatchEntryText(nextMatch)
					: NO_MATCHES_TEXT;
				await dispatchActivity(IDLE_ENTRY_ID, idleText);
				wasLive = false;
				lastDisplayName = IDLE_DISPLAY_NAME;
				return;
			}

			await removeActivity(IDLE_ENTRY_ID);

			let scoredAny = false;
			for (const match of liveMatches) {
				const homeGoals = match.score.fullTime.home ?? 0;
				const awayGoals = match.score.fullTime.away ?? 0;
				const prev = lastMatchState.get(match.id);
				if (prev) {
					// Both teams can score, or one team can score twice, between
					// polls — emit one entry per goal keyed on that side's new tally.
					for (let n = prev.home + 1; n <= homeGoals; n++) {
						scoredAny = true;
						await dispatchActivity(
							`goal-${match.id}-home-${n}`,
							goalEntryText(match, "home"),
						);
					}
					for (let n = prev.away + 1; n <= awayGoals; n++) {
						scoredAny = true;
						await dispatchActivity(
							`goal-${match.id}-away-${n}`,
							goalEntryText(match, "away"),
						);
					}
				}

				await dispatchActivity(String(match.id), matchEntryText(match));

				lastMatchState.set(match.id, {
					home: homeGoals,
					away: awayGoals,
					homeTeam: match.homeTeam.name,
					awayTeam: match.awayTeam.name,
				});
			}

			if (!wasLive) {
				await client.send("status.set", { state: "on" });
			}
			if (scoredAny) {
				await client.send("status.set", { state: "alert" });
				setTimeout(() => {
					// If the match ended during the alert window we're now idle
					// (`working`); don't clobber that back to `on`.
					if (!wasLive) return;
					client.send("status.set", { state: "on" }).catch(() => {});
				}, alertMs);
			}

			const displayName = liveDisplayName(liveMatches);
			if (displayName !== lastDisplayName) {
				console.log(`updating display name -> ${displayName}`);
				await client.send("info.set", { name: displayName });
			}

			wasLive = true;
			lastDisplayName = displayName;
		} catch (err) {
			console.error("poll failed:", err instanceof Error ? err.message : err);
		}
	};

	console.log(
		`Watching World Cup matches every ${values.interval}s. Ctrl+C to stop.`,
	);
	// Self-scheduling loop (not setInterval) so a slow poll can never let the
	// next tick start mid-flight.
	let timer: ReturnType<typeof setTimeout>;
	const tick = async () => {
		await poll();
		timer = setTimeout(tick, intervalMs);
	};
	process.on("SIGINT", () => {
		clearTimeout(timer);
		console.log("\nStopped.");
		process.exit(0);
	});
	tick();
}

main();
