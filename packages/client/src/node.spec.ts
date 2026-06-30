import type { FetchImpl } from "./client";
import type { WebhookEvent } from "./objects/events";

// Mock undici so the Node entry's lazy `import("undici")` resolves without a real network call.
const { undiciFetch } = vi.hoisted(() => ({ undiciFetch: vi.fn() }));
vi.mock("undici", () => ({ fetch: undiciFetch }));

import { Client } from "./node";

const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const URL_ = new URL("https://example.com/hook");

const EVENT: WebhookEvent = {
	type: "switch.toggle",
	timestamp: "2026-06-29T00:00:00.000Z",
	data: {},
};

beforeEach(() => {
	undiciFetch.mockReset();
	undiciFetch.mockImplementation(
		async () => new Response(JSON.stringify({ status: "dispatched" })),
	);
});

describe("node entry", () => {
	it("extends the base Client", async () => {
		const { Client: BaseClient } = await import("./client");
		expect(Object.getPrototypeOf(Client)).toBe(BaseClient);
	});

	it("defaults to undici's fetch and caches it across calls", async () => {
		const client = new Client({ url: URL_, secret: SECRET });

		await expect(client.send(EVENT)).resolves.toEqual({ status: "dispatched" });
		await expect(client.send(EVENT)).resolves.toEqual({ status: "dispatched" });
		expect(undiciFetch).toHaveBeenCalledTimes(2);
	});

	it("allows overriding fetchImpl", async () => {
		const explicit = vi.fn<FetchImpl>(
			async () => new Response(JSON.stringify({ status: "space_idle" })),
		);
		const client = new Client({
			url: URL_,
			secret: SECRET,
			fetchImpl: explicit,
		});

		await expect(client.send(EVENT)).resolves.toEqual({ status: "space_idle" });
		expect(explicit).toHaveBeenCalledOnce();
		expect(undiciFetch).not.toHaveBeenCalled();
	});
});
