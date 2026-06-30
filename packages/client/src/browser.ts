/**
 * Browser entry point (`@webhook-objects/client/browser`). The base
 * {@link Client} already defaults to the global `fetch`, which is always
 * present in browsers, so no environment-specific wiring is needed — this
 * module simply re-exports the public API.
 *
 * @module
 */
export * from "./client";
export * from "./objects";
