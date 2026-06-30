import { Webhook } from "standardwebhooks";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Client, type FetchImpl } from "./client";
import type { WebhookEvent } from "./objects/events";

// Canonical Standard Webhooks test secret (valid base64 after the `whsec_` prefix).
const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const URL_ = new URL("https://example.com/hook");

const EVENT: WebhookEvent = {
	type: "counter.set",
	timestamp: "2026-06-29T00:00:00.000Z",
	data: { count: 5 },
};

const jsonResponse = (body: unknown, init?: ResponseInit): Response =>
	new Response(JSON.stringify(body), {
		status: 200,
		headers: { "content-type": "application/json" },
		...init,
	});

/** A `fetchImpl` mock that resolves to `response` (or a default 200 body). */
const mockFetch = (response?: Response) =>
	vi.fn<FetchImpl>(
		async () => response ?? jsonResponse({ status: "dispatched" }),
	);

/** Pull the `(url, init)` a `fetchImpl` mock was called with, with headers typed. */
const lastCall = (fetchImpl: ReturnType<typeof mockFetch>) => {
	const [url, init] = fetchImpl.mock.calls[0];
	return {
		url,
		init,
		headers: (init?.headers ?? {}) as Record<string, string>,
		body: init?.body as string,
	};
};

/** Run `fn`, expecting it to reject, and return the thrown error. */
const captureError = async (fn: () => Promise<unknown>): Promise<Error> => {
	try {
		await fn();
	} catch (error) {
		return error as Error;
	}
	throw new Error("expected the promise to reject");
};

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("Client.send", () => {
	it("POSTs to the configured URL", async () => {
		const fetchImpl = mockFetch();
		const client = new Client({ url: URL_, secret: SECRET, fetchImpl });

		await client.send(EVENT);

		const { url, init } = lastCall(fetchImpl);
		expect(fetchImpl).toHaveBeenCalledOnce();
		expect(url).toBe(URL_);
		expect(init?.method).toBe("POST");
	});

	it("serializes the event as the JSON body", async () => {
		const fetchImpl = mockFetch();
		const client = new Client({ url: URL_, secret: SECRET, fetchImpl });

		await client.send(EVENT);

		expect(lastCall(fetchImpl).body).toBe(JSON.stringify(EVENT));
	});

	it("sets the Standard Webhooks headers", async () => {
		const fetchImpl = mockFetch();
		const client = new Client({
			url: URL_,
			secret: SECRET,
			fetchImpl,
			idImpl: () => "msg_test",
		});

		await client.send(EVENT);

		const { headers } = lastCall(fetchImpl);
		expect(headers["Content-Type"]).toBe("application/json");
		expect(headers["webhook-id"]).toBe("msg_test");
		expect(headers["webhook-timestamp"]).toMatch(/^\d+$/);
		expect(headers["webhook-signature"]).toMatch(/^v1,/);
	});

	it("stamps the timestamp as Unix seconds", async () => {
		const fetchImpl = mockFetch();
		const client = new Client({ url: URL_, secret: SECRET, fetchImpl });

		await client.send(EVENT);

		const ts = Number(lastCall(fetchImpl).headers["webhook-timestamp"]);
		expect(ts).toBeCloseTo(Math.floor(Date.now() / 1000), -1);
	});

	it("produces a signature that verifies against the secret", async () => {
		const fetchImpl = mockFetch();
		const client = new Client({ url: URL_, secret: SECRET, fetchImpl });

		await client.send(EVENT);

		const { headers, body } = lastCall(fetchImpl);
		const verified = new Webhook(SECRET).verify(body, {
			"webhook-id": headers["webhook-id"],
			"webhook-timestamp": headers["webhook-timestamp"],
			"webhook-signature": headers["webhook-signature"],
		});
		expect(verified).toEqual(EVENT);
	});

	it("returns the parsed JSON body on success", async () => {
		const fetchImpl = mockFetch(jsonResponse({ status: "space_idle" }));
		const client = new Client({ url: URL_, secret: SECRET, fetchImpl });

		await expect(client.send(EVENT)).resolves.toEqual({ status: "space_idle" });
	});

	it("uses a unique id per call from the default idImpl", async () => {
		const fetchImpl = mockFetch();
		const client = new Client({ url: URL_, secret: SECRET, fetchImpl });

		await client.send(EVENT);

		expect(lastCall(fetchImpl).headers["webhook-id"]).toMatch(/^msg_\d+$/);
	});

	it("merges caller-provided RequestInit but forces method and signing headers", async () => {
		const fetchImpl = mockFetch();
		const client = new Client({
			url: URL_,
			secret: SECRET,
			fetchImpl,
			idImpl: () => "msg_real",
		});

		await client.send(EVENT, {
			cache: "no-store",
			headers: { "X-Custom": "1", "webhook-id": "spoofed" },
		} as Parameters<Client["send"]>[1]);

		const { init, headers } = lastCall(fetchImpl);
		expect(init?.cache).toBe("no-store");
		expect(init?.method).toBe("POST");
		expect(headers["X-Custom"]).toBe("1");
		// Client-controlled headers win over caller-supplied ones.
		expect(headers["webhook-id"]).toBe("msg_real");
	});

	it("throws with the status and response cause on a non-OK response", async () => {
		const failure = jsonResponse({ error: "invalid_args" }, { status: 400 });
		const fetchImpl = mockFetch(failure);
		const client = new Client({ url: URL_, secret: SECRET, fetchImpl });

		const error = await captureError(() => client.send(EVENT));
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toContain("Unexpected response status: 400");
		expect((error.cause as { response: Response }).response.status).toBe(400);
	});

	it("throws with the response cause when the body is not JSON", async () => {
		const malformed = new Response("not-json", {
			status: 200,
			headers: { "content-type": "text/plain" },
		});
		const fetchImpl = mockFetch(malformed);
		const client = new Client({ url: URL_, secret: SECRET, fetchImpl });

		const error = await captureError(() => client.send(EVENT));
		expect(error).toBeInstanceOf(Error);
		expect(error.message).toContain("Unexpected response body");
		expect((error.cause as { response: Response }).response).toBe(malformed);
	});
});

describe("Client.requestMetadata", () => {
	const PONG = {
		status: "pong",
		objectId: "obj_1",
		spaceId: "space_1",
		preset: "inbox",
		capabilities: {},
	};

	it("POSTs a webhook.ping event with no timestamp or data", async () => {
		const fetchImpl = mockFetch(jsonResponse(PONG));
		const client = new Client({
			url: URL_,
			secret: SECRET,
			fetchImpl,
			idImpl: () => "msg_ping",
		});

		await client.requestMetadata();

		const { url, init, headers, body } = lastCall(fetchImpl);
		expect(url).toBe(URL_);
		expect(init?.method).toBe("POST");
		expect(JSON.parse(body)).toEqual({ type: "webhook.ping" });
		expect(headers["webhook-id"]).toBe("msg_ping");
		expect(headers["webhook-signature"]).toMatch(/^v1,/);
	});

	it("returns the parsed pong body", async () => {
		const fetchImpl = mockFetch(jsonResponse(PONG));
		const client = new Client({ url: URL_, secret: SECRET, fetchImpl });

		await expect(client.requestMetadata()).resolves.toEqual(PONG);
	});

	it("produces a signature that verifies against the secret", async () => {
		const fetchImpl = mockFetch(jsonResponse(PONG));
		const client = new Client({ url: URL_, secret: SECRET, fetchImpl });

		await client.requestMetadata();

		const { headers, body } = lastCall(fetchImpl);
		const verified = new Webhook(SECRET).verify(body, {
			"webhook-id": headers["webhook-id"],
			"webhook-timestamp": headers["webhook-timestamp"],
			"webhook-signature": headers["webhook-signature"],
		});
		expect(verified).toEqual({ type: "webhook.ping" });
	});

	it("throws with the status and response cause on a non-OK response", async () => {
		const failure = jsonResponse({ error: "not_found" }, { status: 404 });
		const fetchImpl = mockFetch(failure);
		const client = new Client({ url: URL_, secret: SECRET, fetchImpl });

		const error = await captureError(() => client.requestMetadata());
		expect(error.message).toContain("Unexpected response status: 404");
		expect((error.cause as { response: Response }).response.status).toBe(404);
	});
});

describe("Client fetch resolution", () => {
	it("falls back to the global fetch when no fetchImpl is supplied", async () => {
		const globalFetch = mockFetch();
		vi.stubGlobal("fetch", globalFetch);

		const client = new Client({ url: URL_, secret: SECRET });
		await client.send(EVENT);

		expect(globalFetch).toHaveBeenCalledOnce();
	});

	it("throws at construction when no fetch is available", () => {
		vi.stubGlobal("fetch", undefined);

		expect(() => new Client({ url: URL_, secret: SECRET })).toThrow(
			/No global `fetch` is available/,
		);
	});

	it("prefers an explicit fetchImpl over the global fetch", async () => {
		const globalFetch = mockFetch();
		vi.stubGlobal("fetch", globalFetch);
		const explicit = mockFetch();

		const client = new Client({
			url: URL_,
			secret: SECRET,
			fetchImpl: explicit,
		});
		await client.send(EVENT);

		expect(explicit).toHaveBeenCalledOnce();
		expect(globalFetch).not.toHaveBeenCalled();
	});
});
