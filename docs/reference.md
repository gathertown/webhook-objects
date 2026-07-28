# Smart Objects reference

A Smart Object is a Gather map object whose appearance is driven by HTTP webhooks. An external system — a CI job, an AI agent, a home-automation hook, a workflow tool — POSTs signed events to the object's URL, and it updates in the space in real time. The examples in this repo each drive one of the presets below.

This is a conceptual reference for _what a Smart Object can do_. For the typed sending API, see [`@gathertown/webhook-object-sdk`](https://www.npmjs.com/package/@gathertown/webhook-object-sdk).

## How it works

Each Smart Object is one `(url, secret)` pair, copied from the object's ⋮ menu in Gather. You POST [Standard Webhooks](https://www.standardwebhooks.com/)-signed events to the URL and the object applies them to its state. Secrets are per-object — a key for one object never authenticates another.

```ts
import { createWebhookObjectClient, secretFromEnv } from "@gathertown/webhook-object-sdk"

const object = createWebhookObjectClient({
  url: process.env.OBJECT_URL!,
  secret: secretFromEnv("OBJECT_SECRET"), // whsec_…
})

await object.send("counter.increment", { by: 1 })
await object.counter.increment({ by: 1 }) // fluent equivalent
await object.ping() // verify url + secret; returns the object's declared capabilities
```

The SDK handles the wire protocol — HMAC signing, retries, the 4 KB body cap, error decoding — so you never sign by hand. Sending from another language or runtime is fine too: the contract is Standard Webhooks v1 (HMAC-SHA256 over `${webhook-id}.${webhook-timestamp}.${body}`), documented in the SDK's "Wire behavior" section.

## Presets

An object's **preset** is chosen when you place it in Gather and fixes which **capabilities** — and therefore which events — it accepts. Every preset includes the base `info` capability, and every object also answers `webhook.ping`.

| Preset    | Capabilities            | Good for                                                     |
| --------- | ----------------------- | ------------------------------------------------------------ |
| `counter` | info, counter           | a single number — build depth, active users, a score         |
| `switch`  | info, switch            | a binary state — a lamp, a door, "on air"                    |
| `status`  | info, status, activity  | an indicator with a state + a feed — an agent's status light |
| `inbox`   | info, activity, counter | a feed with a count badge — PRs to review, incidents, tasks  |

## Events

Events are addressed on the wire as `<capability>.<method>`. The argument constraints below are enforced by the receiver; violating them returns an error rather than partially applying.

### `info` — every object

The object's user-facing identity.

| Event      | Args                                                |
| ---------- | --------------------------------------------------- |
| `info.set` | `name?` string ≤ 120 · `description?` string ≤ 2000 |

### `counter`

A single non-negative integer, or unset (`null`).

| Event               | Args                                             |
| ------------------- | ------------------------------------------------ |
| `counter.set`       | `count` integer ≥ 0 _(required)_                 |
| `counter.increment` | `by?` positive integer (default 1)               |
| `counter.decrement` | `by?` positive integer (default 1); clamped at 0 |
| `counter.reset`     | — · clears back to unset (`null`)                |

### `switch`

A single boolean on/off state.

| Event              | Args                        |
| ------------------ | --------------------------- |
| `switch.set_state` | `on` boolean _(required)_   |
| `switch.toggle`    | — · flips the current value |

### `status`

A single named indicator state.

| Event          | Args                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| `status.set`   | `state` one of `off` · `on` · `question` · `alert` · `working` _(required)_ |
| `status.reset` | — · returns to `off`                                                         |

### `activity`

A bounded, newest-wins feed rendered in the object's details popover. Each entry has a stable `id`: re-sending the same `id` updates that entry, and stale or out-of-order redeliveries are ignored (ordering uses the signed send time). The feed is capped to the newest entries, and the popover derives a favicon from the entry `url`'s host.

| Event             | Args                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `activity.add`    | `id` string ≤ 128 _(required)_ · `text` string ≤ 500 _(required)_ · `url?` http(s) URL ≤ 2048 |
| `activity.remove` | `id` string ≤ 128 _(required)_                                                                 |
| `activity.clear`  | — · empties the feed                                                                           |

### `webhook.ping` — every object

Reserved health check. Signed like any event but takes no data; returns the object's current preset and capability state (`pong`). Use it to verify the secret and discover which capabilities the object accepts.

## The examples

| Example                                                | Preset   | What it drives                                            |
| ------------------------------------------------------ | -------- | --------------------------------------------------------- |
| [`now-playing-inbox`](../packages/now-playing-inbox)   | `inbox`  | new tracks from Spotify / Apple Music, as a feed + count  |
| [`gh-prs-inbox`](../packages/gh-prs-inbox)             | `inbox`  | PRs awaiting your review, as a feed + count badge         |
| [`claude-status`](../packages/claude-status)           | `status` | a Claude Code session's live status                       |
| [`low-battery-switch`](../packages/low-battery-switch) | `switch` | a switch that turns on when your battery runs low         |
