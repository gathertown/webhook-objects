/**
 * Map Claude Code hook events to status states.
 *
 * Only low-frequency, once-per-turn events are used so the hooks never add
 * per-tool-call latency. POC tradeoff: with no PreToolUse hook, approving a
 * permission mid-turn leaves the object on `question` until the turn's Stop.
 *
 * @module
 */
import type { StatusState } from "@webhook-objects/client/node";

/** The hook events we register, in `settings.json` order. */
export const HOOK_EVENTS = [
	"SessionStart",
	"UserPromptSubmit",
	"Notification",
	"Stop",
	"SessionEnd",
] as const;

const STATE_BY_EVENT: Record<string, StatusState> = {
	SessionStart: "on",
	UserPromptSubmit: "working",
	Notification: "question", // Claude is waiting on you — permission/input
	Stop: "on",
	SessionEnd: "off",
};

/** Map a hook event name to a status, or `undefined` if we don't track it. */
export function eventToState(event: string): StatusState | undefined {
	return STATE_BY_EVENT[event];
}
