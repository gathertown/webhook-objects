# @webhook-objects/now-playing-inbox

Watches your system for playing music (via Spotify, Applie Music), posting any new tracks to an `inbox` webhook object.

macOS only — Uses Apple Script to parse music application state.

## Usage

```sh
pnpm --filter @webhook-objects/now-playing-inbox start \
  --url https://your-object-url \
  --secret whsec_... \
  --interval 5
```

| flag         | required | default | meaning                  |
| ------------ | -------- | ------- | ------------------------ |
| `--url`      | yes      | —       | object's webhook URL     |
| `--secret`   | yes      | —       | Standard Webhooks secret |
| `--interval` | no       | `5`     | poll interval in seconds |
| `--initialize` | no     | off     | clear the activity feed & reset the counter on startup |

Runs until `Ctrl+C`. Each distinct track is sent once as an `activity.add`
(`{ id, text, url }`); Spotify links use its own URL, Music links use an Apple
Music search.

## How it works

`osascript` reads the current track → dedup against the last id → sign & POST
via `@webhook-objects/client`.
