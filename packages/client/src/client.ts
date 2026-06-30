/**
 * The environment-agnostic webhook client. Signs each request with
 * {@link https://www.standardwebhooks.com | Standard Webhooks}, `POST`s it to
 * the configured object URL, and parses the typed response body.
 *
 * @module
 */
import { Webhook, type WebhookOptions } from "standardwebhooks";
import {
	PING_EVENT_TYPE,
	type PingEvent,
	type PingResponseBody,
	type WebhookEvent,
	type WebhookEventResponseBody,
} from "./objects";

/**
 * A {@link RequestInit} with the fields the client owns removed. Callers may
 * customize everything except `body`, `method`, and `window` (those are set by
 * the client when dispatching).
 */
export type MutableRequestInit = Omit<
	RequestInit,
	keyof Pick<RequestInit, "body" | "method" | "window">
>;

/**
 * A `fetch`-compatible function. Matches the global `fetch` signature so either
 * the platform global or `undici`'s implementation can be supplied.
 */
export type FetchImpl = (
	input: URL | RequestInfo,
	init?: RequestInit | undefined,
) => Promise<Response>;

/** Produces the `webhook-id` for an outbound request. Must be unique per call. */
export type IdImpl = () => string;

/** Construction options for {@link Client}. */
export interface ClientOptions {
	/** The object's webhook receiver URL (string is parsed to a `URL`). */
	url: URL | string;
	/** Standard Webhooks signing secret (the `whsec_...` value). */
	secret: string;

	/** Options forwarded to the underlying `standardwebhooks` `Webhook`. */
	signOptions?: WebhookOptions;
	/**
	 * Fetch implementation to use. Defaults to the global `fetch` (available in
	 * browsers and Node 18+). Provide a custom implementation to override it — e.g.
	 * import from `@webhook-objects/client/node` for an undici-backed default.
	 */
	fetchImpl?: FetchImpl;
	/**
	 * Override the `webhook-id` generator. Defaults to {@link createSimpleIdGenerator}.
	 */
	idImpl?: IdImpl;
}

/**
 * Resolve the platform global `fetch`, bound to `globalThis`.
 *
 * @returns The global `fetch` as a {@link FetchImpl}.
 * @throws {Error} When no global `fetch` is available.
 */
const resolveGlobalFetch = (): FetchImpl => {
	if (typeof globalThis.fetch !== "function") {
		throw new Error(
			"No global `fetch` is available. Pass `fetchImpl` in ClientOptions, or import the client from `@webhook-objects/client/node`.",
		);
	}
	return globalThis.fetch.bind(globalThis);
};

/**
 * Build a simple, collision-resistant id generator. Each call returns a value
 * of the form `` `msg_${timestamp}_${counter}` ``; the process-local counter
 * guarantees uniqueness even for sends within the same millisecond.
 *
 * @returns An {@link IdImpl}.
 */
export function createSimpleIdGenerator() {
	let idCounter = 0;

	return () => `msg_${Date.now()}_${idCounter++}`;
}

/** The default {@link IdImpl} used when none is supplied in {@link ClientOptions}. */
const defaultIdImpl = createSimpleIdGenerator();

/**
 * Normalize any `HeadersInit` (record, entries array, or `Headers`) to a plain
 * record, so caller-supplied headers merge correctly regardless of form.
 *
 * @param headers - The caller's headers, in any `HeadersInit` form.
 * @returns A plain `Record<string, string>` (empty when `headers` is absent).
 */
const toHeaderRecord = (headers?: HeadersInit): Record<string, string> => {
	if (!headers) {
		return {};
	}
	if (headers instanceof Headers) {
		return Object.fromEntries(headers.entries());
	}
	if (Array.isArray(headers)) {
		return Object.fromEntries(headers);
	}
	return { ...headers };
};

/**
 * The response body shape for a given outbound event: a {@link PingEvent}
 * resolves to {@link PingResponseBody}, any other event to
 * {@link WebhookEventResponseBody}.
 *
 * @typeParam E - The outbound event type.
 */
type SendResult<E extends WebhookEvent | PingEvent> = E extends PingEvent
	? PingResponseBody
	: WebhookEventResponseBody;

/**
 * Signs and dispatches webhook events to a single object's receiver URL.
 *
 * @example
 * const client = new Client({ url, secret: "whsec_..." });
 * await client.send({ type: "counter.set", timestamp: new Date().toISOString(), data: { count: 1 } });
 */
export class Client {
	/** Parsed receiver URL. */
	private readonly url: URL;
	/** Signer used to produce Standard Webhooks signatures. */
	private readonly webhook: Webhook;
	/** Fetch implementation used to dispatch requests. */
	private readonly fetchImpl: FetchImpl;
	/** Generator for the per-request `webhook-id`. */
	private readonly idImpl: IdImpl;

	/**
	 * @param options - See {@link ClientOptions}.
	 * @throws {Error} When no `fetchImpl` is given and no global `fetch` exists.
	 */
	constructor(options: ClientOptions) {
		this.url =
			typeof options.url === "string" ? new URL(options.url) : options.url;
		this.webhook = new Webhook(options.secret, options.signOptions);
		this.fetchImpl = options.fetchImpl ?? resolveGlobalFetch();
		this.idImpl = options.idImpl ?? defaultIdImpl;
	}

	/**
	 * Send a `webhook.ping` probe and return the object's metadata.
	 *
	 * @returns The parsed {@link PingResponseBody} ("pong") describing the
	 * object's preset and declared capability state.
	 * @throws {Error} On a non-2xx response or an unparseable body.
	 */
	async requestMetadata(): Promise<PingResponseBody> {
		return this.sendInternal({
			type: PING_EVENT_TYPE,
		});
	}

	/**
	 * Sign and dispatch a capability event.
	 *
	 * @param event - The {@link WebhookEvent} to send. Its `type` determines the
	 * required `data` shape.
	 * @param init - Optional request overrides (headers, `signal`, etc.); `body`,
	 * `method`, and `window` are controlled by the client and cannot be set.
	 * @returns The parsed {@link WebhookEventResponseBody} on success.
	 * @throws {Error} On a non-2xx response or an unparseable body; `error.cause`
	 * carries the originating `response` (and `error` for parse failures).
	 */
	async send(
		event: WebhookEvent,
		init?: MutableRequestInit,
	): Promise<WebhookEventResponseBody> {
		return this.sendInternal(event, init);
	}

	/**
	 * Core send routine shared by {@link send} and {@link requestMetadata}:
	 * serializes the event, signs it, dispatches via {@link fetchImpl}, and
	 * parses the JSON body.
	 *
	 * @typeParam E - The outbound event type, which determines the return type.
	 * @param event - The event to send.
	 * @param init - Optional request overrides (see {@link send}).
	 * @returns The parsed response body, typed per {@link SendResult}.
	 * @throws {Error} On a non-2xx response or an unparseable body.
	 */
	private async sendInternal<E extends WebhookEvent | PingEvent>(
		event: E,
		init?: MutableRequestInit,
	): Promise<SendResult<E>> {
		const id = this.idImpl();
		const timestamp = new Date();
		const body = JSON.stringify(event);

		const signature = this.webhook.sign(id, timestamp, body);

		const response = await this.fetchImpl(this.url, {
			...init,
			method: "POST",
			body: body,
			headers: {
				...toHeaderRecord(init?.headers),
				"Content-Type": "application/json",
				"webhook-id": id,
				"webhook-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
				"webhook-signature": signature,
			},
		});

		if (!response.ok) {
			throw new Error(`Unexpected response status: ${response.status}`, {
				cause: {
					response,
				},
			});
		}

		try {
			const json = await response.json();

			// TODO: we could do shape validation here, if we want to be extra strict
			return json as SendResult<E>;
		} catch (error) {
			throw new Error(
				`Unexpected response body: ${error instanceof Error ? error.message : String(error)}`,
				{
					cause: {
						error,
						response,
					},
				},
			);
		}
	}
}
