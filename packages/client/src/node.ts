import {
	Client as BaseClient,
	type ClientOptions,
	type FetchImpl,
} from "./client";

export type {
	ClientOptions,
	FetchImpl,
	IdImpl,
	MutableRequestInit,
} from "./client";
export * from "./objects";

let cachedFetch: FetchImpl | undefined;

/**
 * Resolve a Node fetch implementation lazily, so `undici` is only loaded at
 * runtime in Node and never pulled into a browser bundle. Falls back to the
 * built-in global `fetch` (Node 18+) when `undici` isn't installed.
 */
const nodeFetch: FetchImpl = async (input, init) => {
	if (cachedFetch === undefined) {
		try {
			const { fetch } = await import("undici");
			cachedFetch = fetch as unknown as FetchImpl;
		} catch {
			if (typeof globalThis.fetch !== "function") {
				throw new Error(
					"No fetch implementation available. Install `undici`, run on Node 18+, or pass a custom `fetchImpl`.",
				);
			}
			cachedFetch = globalThis.fetch.bind(globalThis);
		}
	}
	return cachedFetch(input, init);
};

/**
 * Node client. Identical to the base {@link BaseClient}, but defaults `fetchImpl`
 * to undici's `fetch`. Callers may still pass their own `fetchImpl` to override it.
 */
export class Client extends BaseClient {
	constructor(options: ClientOptions) {
		super({ ...options, fetchImpl: options.fetchImpl ?? nodeFetch });
	}
}
