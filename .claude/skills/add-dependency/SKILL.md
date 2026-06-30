---
name: add-dependency
description: Add an npm dependency to the webhook-objects monorepo while respecting the 7-day minimumReleaseAge cooldown, the optional-peerDependency pattern, and the git-branch-lockfile install flags. Use when adding or upgrading any package dependency.
---

# Add a dependency

`pnpm-workspace.yaml` enforces a **`minimumReleaseAge: 10080`** (7 days) — pnpm refuses to install a version published less than 7 days ago. Don't fight it.

## Before installing

1. **Cooldown**: check the version's publish date. If it's <7 days old, install will resolve to an older version (or fail). Pin an older version or wait. Only `vite` is exempt (`minimumReleaseAgeExclude`).
2. **Optional runtime deps** follow the `undici` pattern in `packages/client`: declare in `peerDependencies` + `peerDependenciesMeta: { x: { optional: true } }`, keep it in `devDependencies` for local dev, and load it lazily (`await import("x")`) with a fallback. Use this for anything not every consumer needs.
3. **Externalization**: vite externalizes all non-`@webhook-objects` deps (`external: /^(?!@webhook-objects).*$/`), so new deps are NOT bundled — consumers must be able to resolve them. That's why optional deps go through peerDeps.

## Install

```sh
pnpm --filter @webhook-objects/<pkg> add <dep>      # runtime
pnpm --filter @webhook-objects/<pkg> add -D <dep>   # dev
```

Branch lockfile churn after is normal (`gitBranchLockfile: true`) — see [lockfile-doctor](../lockfile-doctor/SKILL.md). Then run [verify](../verify/SKILL.md).
