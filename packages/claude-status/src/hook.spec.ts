import { expect, it } from "vitest";
import { eventToState } from "./hook";

it("maps hook events to status states", () => {
	expect(eventToState("SessionStart")).toBe("on");
	expect(eventToState("UserPromptSubmit")).toBe("working");
	expect(eventToState("Notification")).toBe("question");
	expect(eventToState("Stop")).toBe("on");
	expect(eventToState("SessionEnd")).toBe("off");
	expect(eventToState("PreToolUse")).toBeUndefined(); // untracked → no send
});
