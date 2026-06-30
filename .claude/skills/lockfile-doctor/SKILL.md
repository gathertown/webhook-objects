---
name: lockfile-doctor
description: Explain and resolve confusing pnpm-lock.yaml diffs in the webhook-objects monorepo, which uses git-branch lockfiles and a CI merge-lockfiles job. Use when an agent is surprised by lockfile changes, conflicts, or churn on a branch.
---

# Lockfile doctor

This repo intentionally has **per-branch lockfiles** — don't "fix" the churn.

## What's configured (`pnpm-workspace.yaml`)

- `gitBranchLockfile: true` — pnpm writes a branch-scoped lockfile, so branches don't fight over one `pnpm-lock.yaml`.
- `mergeGitBranchLockfilesBranchPattern: [main, release*]` — on those branches, branch lockfiles get merged back.
- CI has a `merge-lockfiles` job (`.github/workflows/ci.yml`) that runs only on push to `main`: it re-resolves and commits `chore: merge branch lockfiles [skip ci]`.

## Implications for an agent

- Install with the project flag: `pnpm install --merge-git-branch-lockfiles`. CI uses this too.
- A lockfile diff appearing on your feature branch is **expected**, not a mistake. Commit it.
- **Never hand-edit `pnpm-lock.yaml`** to resolve a conflict. Instead: `pnpm install --merge-git-branch-lockfiles --lockfile-only`, then commit the result.
- Seeing an auto-commit `chore: merge branch lockfiles [skip ci]` on `main` is the CI job, not a human — don't revert it.
- A merge conflict in the lockfile resolves the same way: re-run the lockfile-only install above; let pnpm regenerate it.

If lint/build/test are green after a clean `--merge-git-branch-lockfiles` install, the lockfile is fine regardless of how noisy the diff looks.
