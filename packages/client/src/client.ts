import { Webhook, type WebhookOptions } from "standardwebhooks";
import {
	PING_EVENT_TYPE,
	type PingEvent,
	type PingResponseBody,
	type WebhookEvent,
	type WebhookEventResponseBody,
} from "./objects";

export type MutableRequestInit = Omit<
	RequestInit,
	keyof Pick<RequestInit, "body" | "method" | "window">
>;

export type FetchImpl = (
	input: URL | RequestInfo,
	init?: RequestInit | undefined,
) => Promise<Response>;

export type IdImpl = () => string;

export interface ClientOptions {
	url: URL | string;
	secret: string;

	signOptions?: WebhookOptions;
	/**
	 * Fetch implementation to use. Defaults to the global `fetch` (available in
	 * browsers and Node 18+). Provide a custom implementation to override it — e.g.
	 * import from `@webhook-objects/client/node` for an undici-backed default.
	 */
	fetchImpl?: FetchImpl;
	idImpl?: IdImpl;
}

const resolveGlobalFetch = (): FetchImpl => {
	if (typeof globalThis.fetch !== "function") {
		throw new Error(
			"No global `fetch` is available. Pass `fetchImpl` in ClientOptions, or import the client from `@webhook-objects/client/node`.",
		);
	}
	return globalThis.fetch.bind(globalThis);
};

/** The response body shape for a given outbound event. */
type SendResult<E extends WebhookEvent | PingEvent> = E extends PingEvent
	? PingResponseBody
	: WebhookEventResponseBody;

export class Client {
	private readonly url: URL;
	private readonly webhook: Webhook;
	private readonly fetchImpl: FetchImpl;
	private readonly idImpl: IdImpl;

	constructor(options: ClientOptions) {
		this.url =
			typeof options.url === "string" ? new URL(options.url) : options.url;
		this.webhook = new Webhook(options.secret, options.signOptions);
		this.fetchImpl = options.fetchImpl ?? resolveGlobalFetch();
		this.idImpl = options.idImpl ?? (() => `msg_${Date.now()}`);
	}

	async requestMetadata(): Promise<PingResponseBody> {
		return this.sendInternal({
			type: PING_EVENT_TYPE,
		});
	}

	async send(
		event: WebhookEvent,
		init?: MutableRequestInit,
	): Promise<WebhookEventResponseBody> {
		return this.sendInternal(event, init);
	}

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
				...init?.headers,
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
