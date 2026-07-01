import { loadConfig } from "./config.js"
import { createSmartObjectSender } from "./gather/sender.js"
import { fetchGitHubLogin } from "./github/client.js"
import { createPollEntries } from "./polls/registry.js"
import { runPollCycle } from "./runner.js"

const config = loadConfig()

const pollEntries = createPollEntries({
  openPrs: createSmartObjectSender(
    config.gather.openPrs.url,
    config.gather.openPrs.secret,
  ),
  reviewRequested: createSmartObjectSender(
    config.gather.reviewRequested.url,
    config.gather.reviewRequested.secret,
  ),
})

const login = await fetchGitHubLogin(config.github.token)
const ctx = { github: { ...config.github, login } }

async function tick() {
  try {
    await runPollCycle(ctx, pollEntries)
  } catch (err) {
    console.error("Poll cycle failed:", err)
  }
}

console.log(`Starting gather-bot as @${login} (poll every ${config.pollIntervalMs / 1000}s)`)
await tick()
setInterval(tick, config.pollIntervalMs)
