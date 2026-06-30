import { Client as BrowserClient, PRESET_NAMES } from "./browser";
import { Client as BaseClient } from "./client";
import type { WebhookEvent } from "./objects/events";

const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const URL_ = new URL("https://example.com/hook");

const EVENT: WebhookEvent = {
	type: "switch.toggle",
	timestamp: "2026-06-29T00:00:00.000Z",
	data: {},
};

describe("browser entry", () => {
	it("re-exports the base Client unchanged", () => {
		expect(BrowserClient).toBe(BaseClient);
	});

	it("re-exports the object catalog", () => {
		expect(PRESET_NAMES).toContain("inbox");
	});

	it("sends using the global fetch by default", async () => {
		const globalFetch = vi.fn(
			async () => new Response(JSON.stringify({ status: "dispatched" })),
		);
		vi.stubGlobal("fetch", globalFetch);

		const client = new BrowserClient({ url: URL_, secret: SECRET });
		await client.send(EVENT);

		expect(globalFetch).toHaveBeenCalledOnce();
		vi.unstubAllGlobals();
	});
});
