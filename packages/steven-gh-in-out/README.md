# @webhook-objects/steven-gh-in-out

Polls GitHub for two PR metrics and mirrors each count to a Gather Smart Object
`counter`:

1. Open, ready-for-review PRs you authored or are assigned to (last 14 days)
2. Open PRs that directly named you as reviewer, not yet approved (last 7 days)

Uses the GitHub REST search API (not the `gh` CLI). Configure via `.env` — see
`.env.example`.

## Setup

```sh
cp packages/steven-gh-in-out/.env.example packages/steven-gh-in-out/.env
# fill in GITHUB_TOKEN, GITHUB_REPO, and both Gather webhook URL/secret pairs
pnpm install --merge-git-branch-lockfiles
```

## Usage

```sh
# probe both Smart Objects (webhook.ping)
pnpm --filter @webhook-objects/steven-gh-in-out ping

# clear legacy activity slots and reset counters (one-time migration)
pnpm --filter @webhook-objects/steven-gh-in-out reset

# poll GitHub and push counter.set to both objects (runs until Ctrl+C)
pnpm --filter @webhook-objects/steven-gh-in-out start
```

| env var | required | default | meaning |
| --- | --- | --- | --- |
| `GITHUB_TOKEN` | yes | — | PAT with repo read access |
| `GITHUB_REPO` | yes | — | `owner/repo` to watch |
| `GATHER_WEBHOOK_URL` | yes | — | counter object for open PRs |
| `GATHER_WEBHOOK_SECRET` | yes | — | `whsec_…` for that object |
| `GATHER_REVIEW_WEBHOOK_URL` | yes | — | counter object for review requests |
| `GATHER_REVIEW_WEBHOOK_SECRET` | yes | — | `whsec_…` for that object |
| `POLL_INTERVAL_MS` | no | `600000` | poll interval (min 10000) |

Events are signed and sent via `@webhook-objects/client`.
