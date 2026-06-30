# @webhook-objects/claude-status

PoC. Mirrors a Claude Code session's live status into a `status` webhook object,
driven by Claude's own hooks (no polling).

## Usage

```sh
pnpm --filter @webhook-objects/claude-status build

node packages/claude-status/dist/index.js install-hooks \
  --url https://your-object-url \
  --secret whsec_...
```

Then start a **fresh** Claude session — hooks load at session start. To remove:

```sh
node packages/claude-status/dist/index.js uninstall-hooks
```

| command          | flags                | meaning                                            |
| ---------------- | -------------------- | -------------------------------------------------- |
| `install-hooks`  | `--url`, `--secret`  | patch `~/.claude/settings.json` to push status     |
| `uninstall-hooks`| —                    | remove the hooks this tool added                   |

## How it works

`install-hooks` registers a command on a handful of Claude hook events. On each
event Claude runs the bundled `hook-entry.js` under bare `node`, which maps the
event to a status and signs & POSTs it via `@webhook-objects/client`:

| hook event         | status     |
| ------------------ | ---------- |
| `SessionStart`     | `on`       |
| `UserPromptSubmit` | `working`  |
| `Notification`     | `question` (Claude is waiting on you — permission/input) |
| `Stop`             | `on`       |
| `SessionEnd`       | `off`      |

The send is best-effort (3s timeout, errors swallowed) so a down receiver never
blocks your session. Existing settings and other tools' hooks are preserved;
install is idempotent.

## Notes / limitations

- Only affects sessions started **after** install (hooks load at session start).
- Per-tool hooks are intentionally omitted to avoid per-call latency, so after
  you approve a permission mid-turn the object stays `question` until the turn's
  `Stop`.
- The installed command embeds an absolute path to this checkout. If the
  checkout moves, run `uninstall-hooks` first (or reinstall from the new path).
