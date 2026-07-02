/**
 * Minimal client for the football-data.org v4 API, scoped to the World Cup
 * competition (`WC`). Free tier: basic fixtures/results/tables, 10 req/min —
 * callers are responsible for pacing their own polling.
 *
 * @module
 */

const BASE_URL = "https://api.football-data.org/v4";
const LIVE_STATUSES = new Set(["LIVE", "IN_PLAY", "PAUSED"]);

export type Team = {
	name: string;
	tla?: string;
	shortName?: string;
};

export type Match = {
	id: number;
	utcDate: string;
	status: string;
	minute?: number | null;
	homeTeam: Team;
	awayTeam: Team;
	score: {
		fullTime: {
			home: number | null;
			away: number | null;
		};
	};
};

/** GET a football-data.org path, retrying once on 429 per `Retry-After`. */
async function footballDataFetch(
	path: string,
	apiToken: string,
	// biome-ignore lint/suspicious/noExplicitAny: football-data.org's response shape isn't worth hand-typing in full
): Promise<any> {
	const res = await fetch(`${BASE_URL}${path}`, {
		headers: { "X-Auth-Token": apiToken },
	});
	if (res.status === 429) {
		const retryAfter = Number(res.headers.get("Retry-After") ?? "60") * 1000;
		await new Promise((r) => setTimeout(r, retryAfter));
		return footballDataFetch(path, apiToken);
	}
	if (!res.ok) {
		throw new Error(
			`football-data.org error ${res.status}: ${await res.text()}`,
		);
	}
	return res.json();
}

const byUtcDateAsc = (a: Match, b: Match) =>
	new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();

/** Currently in-progress World Cup matches (`LIVE`/`IN_PLAY`/`PAUSED`). */
export async function fetchLiveMatches(apiToken: string): Promise<Match[]> {
	const json = await footballDataFetch(
		"/competitions/WC/matches?status=LIVE",
		apiToken,
	);
	return json.matches.filter((m: Match) => LIVE_STATUSES.has(m.status));
}

/** Upcoming scheduled World Cup matches, soonest first. */
export async function fetchUpcomingMatches(
	apiToken: string,
	now = Date.now(),
): Promise<Match[]> {
	const today = new Date(now).toISOString().slice(0, 10);
	// dateTo is required alongside dateFrom by the API; 60 days comfortably covers the tournament.
	const dateTo = new Date(now + 60 * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);
	const json = await footballDataFetch(
		`/competitions/WC/matches?status=SCHEDULED&dateFrom=${today}&dateTo=${dateTo}`,
		apiToken,
	);
	return (json.matches as Match[]).sort(byUtcDateAsc);
}

/** Finished World Cup matches on a given `YYYY-MM-DD` date, earliest first. */
export async function fetchResultsForDate(
	apiToken: string,
	dateStr: string,
): Promise<Match[]> {
	const json = await footballDataFetch(
		`/competitions/WC/matches?dateFrom=${dateStr}&dateTo=${dateStr}&status=FINISHED`,
		apiToken,
	);
	return (json.matches as Match[]).sort(byUtcDateAsc);
}
