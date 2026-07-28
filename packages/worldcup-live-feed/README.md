# @webhook-objects/worldcup-live-feed

Polls [football-data.org](https://www.football-data.org/) for World Cup matches
and drives a `status` webhook object:

- **status**: `working` when idle, `on` while any match is live, briefly `alert`
  on a goal (reverts to `on` after `--alert-seconds`)
- **info.name** (on-map, no click needed): `worldcup.town - ⚽ ESP 2-0 AUT`,
  `worldcup.town - ⚽ 3 matches live`, or just `worldcup.town` when idle
- **activity feed** (popover, click to open):
  - `🔴 LIVE: ...` — one entry per live match, score + minute
  - `⚽🎉 GOAL! ...` — one entry per goal, names the scoring team
  - `⏰ Next: ...` — countdown to the next scheduled match when idle (or
    "No live World Cup matches right now" if none scheduled)
  - `🏆 FT: ...` — the moment a live match ends (same day), plus a daily batch
    for the previous day

## Usage

```sh
pnpm --filter @webhook-objects/worldcup-live-feed start \
  --url https://your-object-url \
  --secret whsec_... \
  --football-token your-football-data-org-token \
  --interval 30 \
  --alert-seconds 60
```

| flag                | required | default | meaning                                             |
| ------------------- | -------- | ------- | ---------------------------------------------------- |
| `--url`             | yes      | —       | object's webhook URL                                 |
| `--secret`          | yes      | —       | Standard Webhooks secret                              |
| `--football-token`  | yes\*    | —       | football-data.org API token                           |
| `--interval`        | no       | `30`    | poll interval in seconds (min `6`)                    |
| `--alert-seconds`   | no       | `60`    | how long status stays `alert` after a goal            |

\* `--football-token` can also come from the `FOOTBALL_DATA_API_TOKEN` env var.

Runs until `Ctrl+C`.

## Notes

- Free tier: 12 competitions (World Cup included, code `WC`), basic
  fixtures/results/tables, **10 req/min**. No card/booking data on this tier —
  checked live, match detail has no `bookings` field.
- `--interval` refuses to go below 6s to protect the rate limit. Steady-state
  usage is ~2 req/min live/idle, plus a cached (5 min TTL) lookup for the
  idle countdown and one lookup per calendar day for the previous day's
  results.
- On `429`, football-data.org calls back off using `Retry-After` and retry.
- Entries only re-dispatch when their text actually changes. The feed's sort
  key (`at`) is server-stamped from dispatch time, not sendable via payload —
  re-dispatching unchanged text would bump an old entry ahead of genuinely
  newer ones. The known-entries cache is seeded from `webhook.ping` on start,
  so this holds across restarts too.
