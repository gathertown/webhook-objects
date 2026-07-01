---
name: gather-bot
description: >-
  Project context for gather-bot. Use when working in this repository to
  understand tooling, dependency policy, and where to add project skills.
---

# Gather Bot

## Package management

- Uses **pnpm** via Corepack (`packageManager` in `package.json`). If `pnpm` is missing, run `corepack enable` once.
- **Minimum release age: 7 days.** Dependencies published within the last week are not installed. Settings live in `pnpm-workspace.yaml` (`minimumReleaseAge: 10080` minutes) and `.npmrc` (`min-release-age=7` for npm 11.10+).
- Do not bypass the release-age gate unless the user explicitly asks (e.g. `--min-release-age=0`).

## Project skills

Add reusable agent workflows under `skills/<skill-name>/SKILL.md`. Each skill is a directory with YAML frontmatter (`name`, `description`) and markdown instructions. Cursor discovers them via the `.cursor/skills` symlink to this folder. Do not put project skills in `~/.cursor/skills-cursor/` (Cursor-managed only).
