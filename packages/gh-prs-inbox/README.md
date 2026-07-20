# @webhook-objects/gh-prs-inbox

Uses the GitHub CLI to poll for PRs awaiting your review, mirroring them to an `inbox` webhook object.

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
[`@gathertown/webhook-object-sdk`](https://www.npmjs.com/package/@gathertown/webhook-object-sdk).

"PRs pending review" is a *live set* — a PR leaves the list once reviewed or
merged. Reconciling (rather than clear-and-rewrite) means a failed send only
desyncs one entry, self-healed on the next poll, instead of emptying the feed.
The feed and counter are reset once at startup to drop stale state from a prior
run.

The `activity` feed is a fixed-size ring buffer, so the feed shows the most
recently-updated PRs up to that size while the counter reports the true total.
