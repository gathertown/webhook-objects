# @webhook-objects/gh-prs-inbox

PoC. Polls GitHub for PRs awaiting your review and mirrors them into an `inbox`
webhook object — one activity entry per PR, plus a counter of how many are
waiting.

Requires the [`gh`](https://cli.github.com) CLI, authenticated (`gh auth login`).

## Usage

```sh
pnpm --filter @webhook-objects/gh-prs-inbox start \
  --url https://your-object-url \
  --secret whsec_... \
  --interval 60
```

| flag         | required | default | meaning                  |
| ------------ | -------- | ------- | ------------------------ |
| `--url`      | yes      | —       | object's webhook URL     |
| `--secret`   | yes      | —       | Standard Webhooks secret |
| `--interval` | no       | `60`    | poll interval in seconds |

Runs until `Ctrl+C`.

## How it works

`gh search prs --review-requested=@me --state=open` lists the PRs → each poll
reconciles the feed against them (`activity.add` for newly-pending PRs,
`activity.remove` for ones now gone, then `counter.set`) and signs & POSTs via
`@webhook-objects/client`.

"PRs pending review" is a *live set* — a PR leaves the list once reviewed or
merged. Reconciling (rather than clear-and-rewrite) means a failed send only
desyncs one entry, self-healed on the next poll, instead of emptying the feed.
The feed is cleared once at startup to drop any stale entries from a prior run.
