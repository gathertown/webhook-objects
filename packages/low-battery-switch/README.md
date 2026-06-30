# @webhook-objects/low-battery-switch

PoC. Polls macOS power state and mirrors "running low" into a `switch` webhook
object — on when you're on battery at/below a threshold, off otherwise. A shared
"might drop off the call" light for the space.

macOS only — reads power via the built-in `pmset` (no extra deps).

## Usage

```sh
pnpm --filter @webhook-objects/low-battery-switch start \
  --url https://your-object-url \
  --secret whsec_... \
  --interval 60 \
  --threshold 20
```

| flag          | required | default | meaning                              |
| ------------- | -------- | ------- | ------------------------------------ |
| `--url`       | yes      | —       | object's webhook URL                 |
| `--secret`    | yes      | —       | Standard Webhooks secret             |
| `--interval`  | no       | `60`    | poll interval in seconds             |
| `--threshold` | no       | `20`    | percent at/below which "low" trips   |

Runs until `Ctrl+C`.

## How it works

`pmset -g batt` reports charge percent and whether you're on AC → each poll
decides "low" (on battery AND at/below `--threshold`) and, only when that
changes, sends `switch.set_state` signed via `@webhook-objects/client`. Plugged
in is never low, however empty — you're not about to drop.

Sending only on change keeps the receiver quiet between transitions; a failed
read or send holds the last state and retries on the next poll.
