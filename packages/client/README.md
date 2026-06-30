# @webhook-objects/client

A typed client for dispatching [Standard Webhooks](https://www.standardwebhooks.com/)-signed events to Gather webhook objects, plus the full set of TypeScript types describing every event, capability, preset, and response.

The client signs each request (HMAC over `id`, `timestamp`, and body), `POST`s it to your object's webhook URL, and returns a strongly-typed response body.

## Installation

```bash
npm install @webhook-objects/client
# or
pnpm add @webhook-objects/client
```

### Runtime & `fetch`

- **Browser / Node 18+**: nothing extra needed — the global `fetch` is used by default.
- **Older Node / explicit `undici`**: install [`undici`](https://github.com/nodejs/undici) (an optional peer dependency) and import from `@webhook-objects/client/node`, which defaults `fetchImpl` to undici's `fetch` and falls back to the global `fetch` when undici isn't present.

```bash
pnpm add undici   # only needed for the /node entry point's undici-backed default
```

## Entry points

| Import                            | Use case                                                                       | Default `fetch`                                        |
| --------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `@webhook-objects/client`         | Auto-resolves to the browser build (and node build under the `node` condition) | global `fetch`                                         |
| `@webhook-objects/client/browser` | Explicit browser build                                                         | global `fetch`                                         |
| `@webhook-objects/client/node`    | Node build                                                                     | `undici` (lazy import), falling back to global `fetch` |
| `@webhook-objects/client/objects` | Types only — no client                                                         | n/a                                                    |

## Usage

### Send a capability event

```ts
import { Client } from "@webhook-objects/client/node";

const client = new Client({
  url: "https://api.gather.town/api/v2/hooks/spaces/<spaceId>/objects/<objectId>",
  secret: "whsec_...",
});

const res = await client.send({
  type: "counter.set",
  timestamp: new Date().toISOString(),
  data: { count: 1 },
});

if (res.status === "dispatched" || res.status === "space_idle") {
  // applied
}
```

The `event` argument is a discriminated union: the `type` (`"<capability>.<method>"`) determines the exact shape required for `data`. Unknown properties and mismatched payloads are rejected at compile time.

### Probe object metadata (`webhook.ping`)

```ts
const meta = await client.requestMetadata();

meta.status; // "pong"
meta.objectId; // string
meta.spaceId; // string
meta.preset; // "counter" | "switch" | "inbox" | "status" | null
meta.capabilities; // declared capability state for the preset
```

### Browser

```ts
import { Client } from "@webhook-objects/client/browser";

const client = new Client({ url, secret });
```

## API

### `new Client(options)`

| Option         | Type             | Description                                                      |
| -------------- | ---------------- | ---------------------------------------------------------------- |
| `url`          | `URL \| string`  | The object's webhook receiver URL.                               |
| `secret`       | `string`         | Standard Webhooks signing secret (`whsec_...`).                  |
| `signOptions?` | `WebhookOptions` | Passed through to `standardwebhooks`.                            |
| `fetchImpl?`   | `FetchImpl`      | Override the `fetch` used. Defaults per entry point.             |
| `idImpl?`      | `IdImpl`         | Override webhook id generation. Defaults to `msg_${Date.now()}`. |

> The `/node` `Client` accepts the same options; it only changes the default `fetchImpl`.

### `client.send(event, init?)`

Signs and `POST`s a capability event. Returns `Promise<WebhookEventResponseBody>` (`{ status: "dispatched" }` or `{ status: "space_idle" }`). The optional `init` is a `RequestInit` minus `body`, `method`, and `window` (those are controlled by the client) — use it for custom headers, `signal`, etc.

### `client.requestMetadata()`

Sends a `webhook.ping` and returns `Promise<PingResponseBody>` describing the object's preset and current capability state.

### Errors

`send` / `requestMetadata` reject with an `Error` when:

- the response status is not `2xx` — `cause` is `{ response }`.
- the body isn't valid JSON — `cause` is `{ error, response }`.

## Capabilities, methods & presets

Events are addressed as `"<capability>.<method>"`. The capabilities and their method payloads:

| Capability | Method      | `data`                                                           |
| ---------- | ----------- | ---------------------------------------------------------------- |
| `info`     | `set`       | `{ name?, description? }`                                        |
| `counter`  | `set`       | `{ count: number }`                                              |
| `counter`  | `increment` | `{ by?: number }`                                                |
| `counter`  | `reset`     | `{}`                                                             |
| `switch`   | `set_state` | `{ on: boolean }`                                                |
| `switch`   | `toggle`    | `{}`                                                             |
| `status`   | `set`       | `{ state: "off" \| "on" \| "question" \| "alert" \| "working" }` |
| `status`   | `reset`     | `{}`                                                             |
| `activity` | `add`       | `{ id, text, url? }`                                             |
| `activity` | `remove`    | `{ id }`                                                         |
| `activity` | `clear`     | `{}`                                                             |

Presets compose a fixed set of capabilities (every preset also includes `info`):

| Preset    | Capabilities                  |
| --------- | ----------------------------- |
| `counter` | `info`, `counter`             |
| `switch`  | `info`, `switch`              |
| `inbox`   | `info`, `activity`, `counter` |
| `status`  | `info`, `status`, `activity`  |

## Types

All event, capability, preset, and response types are exported from the package root and from `@webhook-objects/client/objects`. Notable ones:

- `WebhookEvent` — the union of all sendable capability events.
- `PresetWebhookEvent<P>` — events accepted by an object of preset `P`.
- `WebhookEventResponseBody`, `PingResponseBody` — success bodies.
- `WebhookHttpResponse`, `WebhookErrorResponse`, `WebhookErrorCode` — the full receiver response surface.

## Development

```bash
pnpm test     # vitest + coverage
pnpm build    # vite build (JS) + tsc (.d.ts into dist/types)
```

> `*.spec.ts` files named `chilling.spec.ts` are integration tests that hit a live endpoint; they require `GATHER_TOWN_WHO_SECRET` and `GATHER_TOWN_WHO_URL` to be set and are safe to ignore when running unit tests.

## License

Apache-2.0 OR MIT
