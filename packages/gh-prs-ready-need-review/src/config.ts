const WHSEC_PATTERN = /^whsec_.{20,}/;
const WEBHOOK_URL_PATTERN =
	/^https:\/\/api\.v2\.(?:staging\.)?gather\.town\/api\/v2\/hooks\/spaces\/[0-9a-f-]{36}\/objects\/[0-9a-f-]{36}$/i;

function required(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing required env var: ${name}`);
	return value;
}

export function parseRepo(value: string): { owner: string; name: string } {
	const match = value.trim().match(/^([^/]+)\/([^/]+)$/);
	if (!match) {
		throw new Error(
			`GITHUB_REPO must be owner/repo (got ${JSON.stringify(value)})`,
		);
	}
	return { owner: match[1], name: match[2] };
}

function loadGatherWebhook(urlEnv: string, secretEnv: string) {
	const secret = required(secretEnv);
	if (!WHSEC_PATTERN.test(secret)) {
		throw new Error(`${secretEnv} is missing or malformed (expected whsec_…)`);
	}

	const url = required(urlEnv);
	if (!WEBHOOK_URL_PATTERN.test(url)) {
		throw new Error(
			`${urlEnv} is invalid — copy the full URL from the Smart Object setup (spaces/{uuid}/objects/{uuid})`,
		);
	}

	return { url, secret };
}

export type Config = {
	gather: {
		openPrs: { url: string; secret: string };
		reviewRequested: { url: string; secret: string };
	};
	github: { token: string; owner: string; repo: string };
	pollIntervalMs: number;
};

export function loadConfig(): Config {
	const githubRepo = parseRepo(required("GITHUB_REPO"));
	const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS ?? "600000");
	if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 10_000) {
		throw new Error("POLL_INTERVAL_MS must be a number >= 10000");
	}

	return {
		gather: {
			openPrs: loadGatherWebhook(
				"GATHER_WEBHOOK_URL",
				"GATHER_WEBHOOK_SECRET",
			),
			reviewRequested: loadGatherWebhook(
				"GATHER_REVIEW_WEBHOOK_URL",
				"GATHER_REVIEW_WEBHOOK_SECRET",
			),
		},
		github: {
			token: required("GITHUB_TOKEN"),
			owner: githubRepo.owner,
			repo: githubRepo.name,
		},
		pollIntervalMs,
	};
}
