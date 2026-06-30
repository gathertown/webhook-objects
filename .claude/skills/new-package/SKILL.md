---
name: new-package
description: Scaffold a new package under packages/* in the webhook-objects monorepo with correct pnpm workspace, tsconfig (dom vs no-dom), exports map, vite/vitest, and biome wiring. Use when adding a new package or workspace to this repo.
---

# Scaffold a new package

Create `packages/<name>/` mirroring `packages/client`. Getting one piece wrong silently breaks the build, so copy the structure exactly.

## Steps

1. **Pick a TS base** from `@webhook-objects/z-build-config`:
   - Code that touches the DOM / `fetch` in browser → `tsconfig.dom.json` (+ `tsconfig.dom.test.json`).
   - Node-only / no DOM lib → `tsconfig.no-dom.json` (+ `.no-dom.test.json`).

2. **`package.json`** — copy `packages/client/package.json` and change:
   - `name`: `@webhook-objects/<name>`, `version`: `0.1.0-beta.1`, `type: "module"`, `files: ["dist"]`.
   - `scripts.test`: `vitest run --coverage`; `scripts.build`: `vite build && tsc -p tsconfig.lib.types.json`.
   - `exports` map: every public subpath needs `types` + `default` (and `browser`/`node` if dual-target). See [add-public-export](../add-public-export/SKILL.md).
   - dev-dep `@webhook-objects/z-build-config": "workspace:*"`.

3. **tsconfigs** — copy all four from `packages/client`: `tsconfig.json` (references the other three), `tsconfig.lib.json`, `tsconfig.lib.test.json`, `tsconfig.lib.types.json`. Repoint `extends` to the dom/no-dom base you chose.

4. **`vite.config.ts`** — copy client's. Set `build.lib.entry` to your real entry files. Keep `external: /^(?!@webhook-objects).*$/` (externalizes everything except workspace deps). Keep the two vitest `projects` (node + chromium) only if you have browser specs; drop the chromium project for node-only packages.

5. No per-package biome config — root `biome.json` covers `**`. Tabs, double quotes, organize-imports on.

6. Verify: `pnpm install` then run [verify](../verify/SKILL.md).

Skipped: a generator script — copying client is faster and rarer than maintaining a template.
