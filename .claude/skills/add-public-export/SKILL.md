---
name: add-public-export
description: Add or expose a new public API export in @webhook-objects/client, threading it through the browser/node entry points, the objects barrel, the package.json exports map, and the types build. Use when adding a publicly importable symbol, type, or subpath to the client package.
---

# Add a public export

The client has a **dual browser/node surface**. An export that only goes through one path resolves in node but 404s in the browser bundle (or vice versa). Thread it through every layer.

## Where things live (`packages/client`)

- `src/client.ts` — environment-agnostic core (the `Client` class, option types).
- `src/browser.ts` — `export * from "./client"` + `"./objects"`. Browser entry.
- `src/node.ts` — re-exports the same public types, then **overrides `Client`** with an undici-backed `fetchImpl`. Note it uses named `export type {…}` for the type surface, not `export *` — add new public types here too.
- `src/objects/index.ts` — barrel for domain types (capabilities/events/presets/responses) + the `VERSION` const.
- `package.json` `exports` — subpaths `.`, `./browser`, `./node`, `./objects`.
- `vite.config.ts` `build.lib.entry` — the bundle entry points.
- `tsconfig.lib.types.json` — emits `dist/types/**` `.d.ts`.

## Checklist when adding a symbol

1. Put the implementation/type in the right source module (`client.ts` for shared, `objects/*` for domain types).
2. Make sure it's re-exported from **both** `browser.ts` and `node.ts`. `node.ts` lists public types explicitly — add yours to that `export type {…}` block.
3. New **subpath** (e.g. `./foo`)? Add it to `package.json` `exports` (`types` + `default`, plus `browser`/`node` if dual) **and** to `vite.config.ts` `build.lib.entry` and the types tsconfig include.
4. Run [verify](../verify/SKILL.md) — `tsc -p tsconfig.lib.types.json` catches a missing `.d.ts`; checking `dist/` after build confirms the bundle resolves.

Skip the subpath steps (3) for a symbol added to an existing entry — only new top-level import paths need exports-map changes.
