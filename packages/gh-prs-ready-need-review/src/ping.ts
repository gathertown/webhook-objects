import { createWebhookObjectClient } from "@gathertown/webhook-object-sdk";
import { loadConfig } from "./config";

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
	const result = await client.ping();
	console.log(`\n${name}:`);
	console.log(JSON.stringify(result, null, 2));
}
