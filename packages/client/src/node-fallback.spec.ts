import type { WebhookEvent } from "./objects/events";

// Simulate `undici` not being installed: its lazy `import("undici")` rejects.
vi.mock("undici", () => {
	throw new Error("Cannot find module 'undici'");
});

const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const URL_ = new URL("https://example.com/hook");

const EVENT: WebhookEvent = {
	type: "switch.toggle",
	timestamp: "2026-06-29T00:00:00.000Z",
	data: {},
};

beforeEach(() => {
	// Reset the module-level fetch cache in node.ts between cases.
	vi.resetModules();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("node entry — undici unavailable", () => {
	it("falls back to the global fetch", async () => {
		const globalFetch = vi.fn(
			async () => new Response(JSON.stringify({ status: "dispatched" })),
		);
		vi.stubGlobal("fetch", globalFetch);

		const { Client } = await import("./node");
		const client = new Client({ url: URL_, secret: SECRET });

		await expect(client.send(EVENT)).resolves.toEqual({ status: "dispatched" });
		expect(globalFetch).toHaveBeenCalledOnce();
	});

	it("throws when neither undici nor a global fetch is available", async () => {
		vi.stubGlobal("fetch", undefined);

		const { Client } = await import("./node");
		const client = new Client({ url: URL_, secret: SECRET });

		await expect(client.send(EVENT)).rejects.toThrow(
			/No fetch implementation available/,
		);
	});
});
