import { createWebhookObjectClient } from "@gathertown/webhook-object-sdk";
import { loadConfig } from "./config";

/** Activity slot ids from the pre-counter inbox publisher. */
const LEGACY_ACTIVITY_SLOT_IDS = [
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
	"github-pr-review-count",
];

const config = loadConfig();

const targets = [
	{ name: "open PRs (authored/assigned)", ...config.gather.openPrs },
	{
		name: "unapproved direct review-requested PRs",
		...config.gather.reviewRequested,
	},
];

for (const { name, url, secret } of targets) {
	const client = createWebhookObjectClient({ url, secret });

	for (const id of LEGACY_ACTIVITY_SLOT_IDS) {
		await client.send("activity.remove", { id });
	}

	const result = await client.send("counter.reset");
	console.log(
		`${name}: cleared ${LEGACY_ACTIVITY_SLOT_IDS.length} legacy slots + counter (${JSON.stringify(result)})`,
	);
}
