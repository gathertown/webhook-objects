---
name: verify
description: Run lint, build, and tests exactly as CI does (including Playwright Chromium and the node+browser vitest split) before pushing the webhook-objects monorepo. Use as a preflight check before opening or updating a PR, or to reproduce a CI failure locally.
---

# CI-parity preflight

Mirror `.github/workflows/ci.yml` so "passes locally" means "passes in CI". The trap is the **browser (chromium) vitest project** — node-only test runs miss it.

## Run, in order (from repo root)

```sh
pnpm install --merge-git-branch-lockfiles
pnpm exec playwright install --with-deps chromium   # needed for the chromium vitest project
pnpm lint      # biome check
pnpm build     # pnpm -r build  (vite build + tsc types per package)
pnpm test      # pnpm -r test  (vitest: node + chromium projects, with coverage)
```

## Notes

- Vitest runs two projects (`packages/client/vite.config.ts`): `node` (excludes `browser.spec.ts`) and `chromium` (`client.spec.ts` + `browser.spec.ts`). A failure naming the chromium project won't reproduce under a node-only run.
- First-time chromium install is slow but cached after.
- Lint failures are usually auto-fixable: `pnpm biome check --write`.
- Lockfile noise on a branch is expected — see [lockfile-doctor](../lockfile-doctor/SKILL.md). Don't "fix" it by editing `pnpm-lock.yaml` by hand.
