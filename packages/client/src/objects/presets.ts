/**
 * Presets: named bundles of capabilities that an object can be created as.
 *
 * A preset (e.g. `counter`, `inbox`) fixes which capabilities an object
 * exposes. This module derives the per-preset capability sets, declared-state
 * shapes, and the visual states an object renders.
 *
 * @module
 */
import type {
	CapabilitiesBlob,
	CapabilityName,
	CapabilityState,
	StatusState,
} from "./capabilities";

/** Every available preset name, as a readonly tuple. */
export const PRESET_NAMES = ["counter", "switch", "inbox", "status"] as const;

/** A single preset name — the union derived from {@link PRESET_NAMES}. */
export type PresetName = (typeof PRESET_NAMES)[number];

/** Capabilities composed onto every webhook object regardless of preset. */
export const BASE_CAPABILITY_NAMES = [
	"info",
] as const satisfies readonly CapabilityName[];

/**
 * The capabilities each preset exposes. Every preset includes the
 * {@link BASE_CAPABILITY_NAMES} (`info`) plus its preset-specific ones.
 */
export const PRESET_CAPABILITIES = {
	counter: ["info", "counter"],
	switch: ["info", "switch"],
	inbox: ["info", "activity", "counter"],
	status: ["info", "status", "activity"],
} as const satisfies Record<PresetName, readonly CapabilityName[]>;

/**
 * Union of capability names exposed by a given preset.
 *
 * @typeParam P - The preset name.
 */
export type PresetCapabilityName<P extends PresetName> =
	(typeof PRESET_CAPABILITIES)[P][number];

/**
 * Partial persisted state for a preset — each declared capability slot is
 * optional (any may be absent).
 *
 * @typeParam P - The preset name.
 * @see DeclaredCapabilitiesState for the fully-materialized variant.
 */
export type PresetCapabilitiesState<P extends PresetName> = {
	[N in PresetCapabilityName<P>]?: CapabilityState<N>;
};

/** Rendered visual states for a counter-style object (empty → full). */
export type CountVisualState =
	| "empty"
	| "count_1"
	| "count_2"
	| "count_3"
	| "count_4"
	| "count_5"
	| "count_6"
	| "count_7"
	| "count_8"
	| "count_9"
	| "count_10"
	| "full";

/** Rendered visual states for a switch object. */
export type SwitchVisualState = "on" | "off";

/** Rendered visual states for a status object — mirrors {@link StatusState}. */
export type StatusVisualState = StatusState;

/**
 * The set of visual states an object of a given preset can render.
 *
 * - `counter` / `inbox` → {@link CountVisualState}
 * - `switch` → {@link SwitchVisualState}
 * - `status` → {@link StatusVisualState}
 *
 * @typeParam P - The preset name.
 */
export type PresetVisualState<P extends PresetName> = P extends
	| "counter"
	| "inbox"
	? CountVisualState
	: P extends "switch"
		? SwitchVisualState
		: P extends "status"
			? StatusVisualState
			: never;

/**
 * Full declared capability surface for a preset, with each slot materialized
 * (required and non-nullable). This is what a `webhook.ping` echoes back.
 *
 * @typeParam P - The preset name.
 */
export type DeclaredCapabilitiesState<P extends PresetName> = {
	[N in PresetCapabilityName<P>]: NonNullable<CapabilitiesBlob[N]>;
};
