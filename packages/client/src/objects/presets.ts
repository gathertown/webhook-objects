import type {
	CapabilitiesBlob,
	CapabilityName,
	CapabilityState,
	StatusState,
} from "./capabilities";

export const PRESET_NAMES = ["counter", "switch", "inbox", "status"] as const;

export type PresetName = (typeof PRESET_NAMES)[number];

/** Capabilities composed onto every webhook object regardless of preset. */
export const BASE_CAPABILITY_NAMES = [
	"info",
] as const satisfies readonly CapabilityName[];

export const PRESET_CAPABILITIES = {
	counter: ["info", "counter"],
	switch: ["info", "switch"],
	inbox: ["info", "activity", "counter"],
	status: ["info", "status", "activity"],
} as const satisfies Record<PresetName, readonly CapabilityName[]>;

export type PresetCapabilityName<P extends PresetName> =
	(typeof PRESET_CAPABILITIES)[P][number];

export type PresetCapabilitiesState<P extends PresetName> = {
	[N in PresetCapabilityName<P>]?: CapabilityState<N>;
};

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

export type SwitchVisualState = "on" | "off";

export type StatusVisualState = StatusState;

export type PresetVisualState<P extends PresetName> = P extends
	| "counter"
	| "inbox"
	? CountVisualState
	: P extends "switch"
		? SwitchVisualState
		: P extends "status"
			? StatusVisualState
			: never;

/** Full declared capability surface for a preset, with each slot materialized. */
export type DeclaredCapabilitiesState<P extends PresetName> = {
	[N in PresetCapabilityName<P>]: NonNullable<CapabilitiesBlob[N]>;
};
