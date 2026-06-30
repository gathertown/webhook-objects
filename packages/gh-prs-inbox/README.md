# @webhook-objects/gh-prs-inbox

POC: mirrors the PRs awaiting your review into an `inbox` webhook object.

Each poll wipes the object's activity feed, re-adds one entry per PR (linked to
the PR), and sets the counter to the PR count.

## Requirements

- `gh` CLI, authenticated (`gh auth login`).
- An `inbox` webhook object's receiver URL + signing secret.

## Run

```sh
pnpm start --url <object-url> --secret whsec_... [--interval 60]
```

`--interval` is in seconds (default 60). Runs until Ctrl+C.
