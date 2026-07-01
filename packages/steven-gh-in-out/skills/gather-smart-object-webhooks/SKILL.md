---
name: gather-smart-object-webhooks
description: >-
  Wire external systems to Gather Smart Objects via signed webhooks (Standard
  Webhooks v1). Use when creating bot webhooks, connecting CI/monitoring/CRM to
  an Inbox or other Smart Object, signing POST requests with whsec_ secrets, or
  calling activity.add, info.set, and webhook.ping.
---

> **Source of truth: the live endpoint.** Before sending real events, run the `webhook.ping` self-check below — its `pong` response confirms the contract and the object's actual capabilities. If anything here contradicts the live response, trust the endpoint.

# Wire up a Gather Smart Object (`Inbox` / `inbox` preset)

You're connecting an external system (CI, monitoring, a CRM, a cron job…) to a Smart Object in a Gather space. Your system signs and POSTs events to one URL; the object updates live in the space.

**Each Smart Object is independent, and so is its secret.** The URL and signing secret below belong to _this one object only_ — a key generated for one object will **not** authenticate any other (you'll get `404 not_found`), and there's no space-wide or account-wide key. To wire up several objects, reuse the `createSmartObjectSender` factory below — one instance per object, each with its own URL and its own secret env var. The factory is identical for every object, so define it once and import it; only the `(url, secret)` pair differs. Regenerating an object's key immediately invalidates its previous one.

## Your configuration

| Setting                  | Value                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Webhook URL              | `https://api.v2.staging.gather.town/api/v2/hooks/spaces/eb638dc6-570a-43ce-822f-c2a3f0fd9f3b/objects/17554f00-b6f6-41a9-8a19-d8a71bb0b9df`                                                                                                                                                   |
| API key (signing secret) | `whsec_…` — **paste the key you copied** from the object's ⋮ menu → "Regenerate API key" (shown once). Store it in `GATHER_WEBHOOK_SECRET`; never commit or log it. |
| Signature scheme         | Standard Webhooks v1 (`webhook-id` / `webhook-timestamp` / `webhook-signature`)                                                                                     |

## Security & sanity checks — do these

1. **Never store the secret in plain sight.** Read it from an env var / secret manager; never hardcode, commit, or log it (mask it if you must log a request).
2. **Validate the secret before use.** It must start with `whsec_`; fail fast if it's missing or truncated.
3. **Check the response status every time.** `200` = accepted. Do **not** blindly retry `4xx` (`400`/`404`/`410`/`415`) — fix the request. Retry only `5xx`/`503`, with backoff.
4. **Honor the rate-limit headers — don't DDoS Gather.** Responses carry `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` (Unix seconds). Throttle proactively; on `429`, sleep until `RateLimit-Reset`; use exponential backoff with jitter. Limits: **60 req/min per space**, **100/min per IP** — coalesce bursts instead of one webhook per micro-event.
5. **Send a fresh timestamp.** The server rejects timestamps more than **±5 minutes** off. Stamp each request at send time; never replay an old signed body.
6. **Use a unique `webhook-id` per event, reused on retry.** The server dedupes the last 10 ids per object, so retrying the same id is idempotent; a new id is a new event.

## Signing (Standard Webhooks — use a library)

Auth follows the [Standard Webhooks](https://www.standardwebhooks.com/) spec, so **do not hand-roll the HMAC** — use the official `standardwebhooks` library for your language (JS/TS, Python, Go, Ruby, PHP, Rust, …). You give it the `whsec_…` secret + payload; it builds the headers and signature.

- `POST` the webhook URL with `Content-Type: application/json`, body ≤ **4 KB**.
- `webhook-signature` is `v1,<base64 HMAC-SHA256>` over `` `${webhook-id}.${webhook-timestamp}.${rawBody}` `` (the library handles it).

> **⚠️ Sign the exact bytes you send.** The HMAC covers the raw body bytes. Serialize the body once, sign that exact string, and send it unchanged — do **not** pretty-print/beautify, reorder keys, or re-serialize after signing, or you'll get the opaque `404 not_found`.

Body shape: `{ "type": "<capability>.<method>", "timestamp": "<ISO-8601>", "data": { … } }` (`timestamp` required except for `webhook.ping`).

## Quick start (Node.js)

```bash
npm install standardwebhooks
```

```javascript
import { Webhook } from "standardwebhooks"
import { randomUUID } from "node:crypto"

// Define ONCE (identical for every object). Each Smart Object is just a (url, secret) pair —
// create one sender per object and never share a key between objects.
function createSmartObjectSender(url, secret) {
  if (!/^whsec_.{20,}/.test(secret ?? ""))
    throw new Error(`Smart Object secret for ${url} is missing or malformed`)
  const webhook = new Webhook(secret)
  return async function send(type, data = {}) {
    const id = randomUUID()
    const tsSeconds = Math.floor(Date.now() / 1000)
    const body = JSON.stringify({ type, timestamp: new Date().toISOString(), data })
    const signature = webhook.sign(id, new Date(tsSeconds * 1000), body)
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": id,
        "webhook-timestamp": String(tsSeconds),
        "webhook-signature": signature,
      },
      body,
    })
    if (res.status === 429) {
      const reset = Number(res.headers.get("RateLimit-Reset")) * 1000
      await new Promise((r) => setTimeout(r, Math.max(0, reset - Date.now()) + 250))
      return send(type, data)
    }
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
    return res.json()
  }
}

// This object — paste the key you copied (e.g. whsec_PASTE_YOUR_API_KEY_HERE) into its own env var; never hardcode, commit, or log it:
const thisObject = createSmartObjectSender("https://api.v2.staging.gather.town/api/v2/hooks/spaces/eb638dc6-570a-43ce-822f-c2a3f0fd9f3b/objects/17554f00-b6f6-41a9-8a19-d8a71bb0b9df", process.env.GATHER_WEBHOOK_SECRET)

// Each additional object reuses the SAME factory with its own URL + secret:
// const deployBoard = createSmartObjectSender(DEPLOY_BOARD_URL, process.env.GATHER_DEPLOY_BOARD_SECRET)
```

## What this object accepts

This is an `inbox` Smart Object. Send `<capability>.<method>` in `type`:

### `info`
Base capability carrying a Smart Object's user-facing identity: a display `name`
and an optional `description`. Composed onto every preset (see `BASE_CAPABILITY_NAMES`)
so every webhook object has editable details regardless of integration type.

- `info.set` — `name` (string, ≤120 chars, optional), `description` (string, ≤2000 chars, optional)

### `activity`
`activity` capability: a bounded, newest-wins log of items for a Smart Object, rendered as a feed in
the details popover. Each entry is display-oriented, a sender-supplied `id` (stable identity), a
human-readable `text` line, and an optional `url` to link out to the source (a PR, an incident, etc).
The popover derives a favicon from the `url`'s hostname.

Methods (wire-addressed as `activity.<method>`):
  - `add({ id, text, url? })`: add-or-update by `id`.
    A newer event (by signed `at`) replaces the existing entry; a stale or out-of-order redelivery is ignored.
    Entries are ordered by `at` and capped to the newest `ACTIVITY_BUFFER_SIZE`. `at` is
    stamped from the signed dispatch context, never the args.
  - `remove({ id })`: drop the entry with that id (e.g. an incident resolved).

- `activity.add` — `id` (string, ≤128 chars, required), `text` (string, ≤500 chars, required), `url` (http/https URL, ≤2048 chars, optional)
- `activity.remove` — `id` (string, ≤128 chars, required)

### `counter`
`counter` capability, a single non-negative integer state, or `null` when unset / cleared.

Methods (addressed on the wire as `counter.<method>`):
  - `set({ count })`: overwrite the count. Negative / fractional values are rejected.
  - `increment({ by? })`: add `by` (default `+1`) to the current count; a cleared count counts from 0. `by` must be a positive integer.
  - `reset()`: clear the count back to unset (`null`). Presets that fall back when unset revert to their default.

- `counter.set` — `count` (integer, ≥0, required)
- `counter.increment` — `by` (integer, >0, optional)
- `counter.reset` — no `data`

**Reserved (every object):**
- `webhook.ping` — Protocol-level health check. Signed like any event but needs no `timestamp`/`data`; returns the object's current preset + capability state (`pong`). Use it to verify the secret and discover which capabilities the object accepts.

## Verify setup first: `webhook.ping`

```javascript
await thisObject("webhook.ping") // 200 { "status": "pong", preset, capabilities }
```

`pong` echoes the object's real capabilities — use it to confirm the secret works and what this object accepts.

## Responses & errors

- **200** `{"status":"dispatched"}` (space live) or `{"status":"space_idle"}` (space unloaded) — both mean accepted.
- **400** `invalid_request`/`invalid_args` — bad body/data; fix it.
- **404** `not_found` — uniform pre-auth failure: bad/missing signature, expired timestamp, wrong URL, oversized body, or a reformatted body. Check the secret, timestamp skew, and that you sent the exact signed bytes.
- **404** `capability_not_declared` — the object doesn't support that `type` (run `webhook.ping`).
- **410** `token_revoked` — key was regenerated; get the new one.
- **415** — set `Content-Type: application/json`.
- **429** — rate limited; honor `RateLimit-Reset`.
- **503** — transient; includes `Retry-After`.
