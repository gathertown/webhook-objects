/**
 * Barrel of all webhook-object domain types: capabilities, events, presets,
 * and responses. Import from `@webhook-objects/client/objects` for types only
 * (no client runtime).
 *
 * @module
 */
export * from "./capabilities";
export * from "./events";
export * from "./presets";
export * from "./responses";

/** The `gather-game-logic` commit these type definitions were generated from. */
export const VERSION = "83b42349949bf0e0d9c2497d8bbbb016840b2995" as const;
