/**
 * Node entry point (`@webhook-objects/client/node`). Re-exports the full public
 * API and overrides the default `fetch` to use `undici` when available.
 *
 * @module
 */
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

/** Memoized resolved fetch, so `undici` is imported at most once. */
let cachedFetch: FetchImpl | undefined;

/**
 * Resolve a Node fetch implementation lazily, so `undici` is only loaded at
 * runtime in Node and never pulled into a browser bundle. Falls back to the
 * built-in global `fetch` (Node 18+) when `undici` isn't installed.
 *
 * @param input - Request input, forwarded to the resolved fetch.
 * @param init - Request init, forwarded to the resolved fetch.
 * @returns The fetch `Response`.
 * @throws {Error} When neither `undici` nor a global `fetch` is available.
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
	/**
	 * @param options - See {@link ClientOptions}. `fetchImpl` defaults to an
	 * undici-backed implementation (with a global-`fetch` fallback).
	 */
	constructor(options: ClientOptions) {
		super({ ...options, fetchImpl: options.fetchImpl ?? nodeFetch });
	}
}
