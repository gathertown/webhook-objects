---
name: write-spec
description: Write a vitest spec for the webhook-objects client matching the repo's existing conventions — the node/browser/agnostic test split and the fetch/signing stub patterns. Use when adding or updating tests in packages/client.
---

# Write a spec

Tests are `*.spec.ts` next to the source. Vitest runs two projects (see `packages/client/vite.config.ts`) — **which file you name decides where it runs**:

- **Agnostic** (`client.spec.ts`) → runs in BOTH node and chromium. Use for logic that doesn't depend on the environment.
- **Browser-only** (`browser.spec.ts`) → chromium project only. Excluded from node.
- **Node-only** (`node.spec.ts`, `node-fallback.spec.ts`) → node project only. Anything that mocks `undici`, uses `process`, or relies on module-level state.

`globals: true` is set — `describe/it/expect/vi/beforeEach` are available without imports.

## Stubbing patterns (from existing specs)

- **Fetch**: pass a fake via `ClientOptions.fetchImpl` (a `vi.fn` returning a `Response`), or `vi.stubGlobal("fetch", fn)`. Pair `stubGlobal` with `afterEach(() => vi.unstubAllGlobals())`.
- **undici absent / node fallback** (`node-fallback.spec.ts`): `vi.mock("undici", () => { throw new Error(...) })`, and `vi.resetModules()` in `beforeEach` to clear `node.ts`'s memoized `cachedFetch` between cases.
- **Signing**: the client signs via `standardwebhooks`. Use a `whsec_…` secret and a fixed `idImpl` when asserting on signature headers, so the request is deterministic.
- Test fixtures: a `WebhookEvent` literal + a `new URL(...)` target, as in the existing specs.

Match the file naming to the environment — a node-only assertion in `client.spec.ts` will fail in the chromium project.
