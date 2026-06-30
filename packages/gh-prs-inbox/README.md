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
rewrites the whole feed (`activity.clear` → an `activity.add` per PR →
`counter.set`) and signs & POSTs via `@webhook-objects/client`.

Unlike an append-only feed, "PRs pending review" is a *live set* — a PR leaves
the list once reviewed or merged — so the feed is rewritten wholesale each poll
rather than incrementally appended.
