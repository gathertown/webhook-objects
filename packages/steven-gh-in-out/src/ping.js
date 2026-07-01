import { loadConfig } from "./config.js"
import { createSmartObjectSender } from "./gather/sender.js"

const config = loadConfig()

const targets = [
  { name: "open PRs (authored/assigned)", ...config.gather.openPrs },
  { name: "unapproved direct review-requested PRs", ...config.gather.reviewRequested },
]

for (const { name, url, secret } of targets) {
  const send = createSmartObjectSender(url, secret)
  const result = await send("webhook.ping")
  console.log(`\n${name}:`)
  console.log(JSON.stringify(result, null, 2))
}
