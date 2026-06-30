/**
 * Capability primitives: the persisted state shapes, the method-argument
 * payloads, and the helper types used to derive event/response types from them.
 *
 * A "capability" is a unit of behavior an object can expose (e.g. `counter`,
 * `switch`). Each capability declares both the state it persists and the
 * methods (with their argument payloads) that can be invoked against it.
 *
 * @module
 */

/** Maximum length (in characters) accepted for an object's `name`. */
export const WEBHOOK_OBJECT_NAME_MAX_LENGTH = 120;
/** Maximum length (in characters) accepted for an object's `description`. */
export const WEBHOOK_OBJECT_DESCRIPTION_MAX_LENGTH = 2000;

/** Maximum number of {@link ActivityEntry} items retained per object (ring buffer). */
export const ACTIVITY_BUFFER_SIZE = 20;
/** Maximum length (in characters) accepted for an {@link ActivityEntry.id}. */
export const ACTIVITY_ID_MAX_LENGTH = 128;
/** Maximum length (in characters) accepted for an {@link ActivityEntry.text}. */
export const ACTIVITY_TEXT_MAX_LENGTH = 500;
/** Maximum length (in characters) accepted for an {@link ActivityEntry.url}. */
export const ACTIVITY_URL_MAX_LENGTH = 2048;

/** Every status value the `status` capability can hold, as a readonly tuple. */
export const STATUS_STATES = [
	"off",
	"on",
	"question",
	"alert",
	"working",
] as const;

/** A single status value — the union derived from {@link STATUS_STATES}. */
export type StatusState = (typeof STATUS_STATES)[number];

/** Persisted state for the `info` capability: human-readable name/description. */
export type InfoState = {
	/** Display name. Capped at {@link WEBHOOK_OBJECT_NAME_MAX_LENGTH}. */
	name?: string;
	/** Free-form description. Capped at {@link WEBHOOK_OBJECT_DESCRIPTION_MAX_LENGTH}. */
	description?: string;
};

/** Persisted state for the `counter` capability. `null` means "unset". */
export type CounterState = {
	/** Current count, or `null` when the counter has never been set. */
	count: number | null;
};

/** Persisted state for the `switch` capability. */
export type SwitchState = {
	/** Whether the switch is currently on. */
	on: boolean;
};

/** Persisted state for the `status` capability. */
export type StatusCapabilityState = {
	/** The active {@link StatusState}. */
	state: StatusState;
};

/** A single entry in an `activity` feed. */
export type ActivityEntry = {
	/** Caller-supplied stable identifier. Capped at {@link ACTIVITY_ID_MAX_LENGTH}. */
	id: string;
	/** Creation time, in Unix milliseconds. */
	at: number;
	/** Display text. Capped at {@link ACTIVITY_TEXT_MAX_LENGTH}. */
	text: string;
	/** Optional link. Capped at {@link ACTIVITY_URL_MAX_LENGTH}. */
	url?: string;
};

/** Persisted state for the `activity` capability: a bounded list of entries. */
export type ActivityState = {
	/** Most-recent-first entries, capped at {@link ACTIVITY_BUFFER_SIZE}. */
	entries: ActivityEntry[];
};

/**
 * The argument payload (`data`) for every capability method, keyed first by
 * capability name and then by method name. This is the single source of truth
 * from which event payload types are derived.
 *
 * Methods that take no arguments use `Record<string, never>` (an empty object).
 */
export interface CapabilityMethodArgs {
	info: {
		/** Update the object's name and/or description. */
		set: {
			name?: string;
			description?: string;
		};
	};
	counter: {
		/** Set the counter to an absolute value. */
		set: {
			count: number;
		};
		/** Add to the counter (defaults to `1` when `by` is omitted). */
		increment: {
			by?: number;
		};
		/** Clear the counter back to its unset state. Takes no arguments. */
		reset: Record<string, never>;
	};
	switch: {
		/** Set the switch to an explicit on/off value. */
		set_state: {
			on: boolean;
		};
		/** Flip the switch. Takes no arguments. */
		toggle: Record<string, never>;
	};
	status: {
		/** Set the active status value. */
		set: {
			state: StatusState;
		};
		/** Reset the status to its default. Takes no arguments. */
		reset: Record<string, never>;
	};
	activity: {
		/** Append an entry to the feed. */
		add: {
			id: string;
			text: string;
			url?: string;
		};
		/** Remove a previously-added entry by id. */
		remove: {
			id: string;
		};
		/** Remove all entries. Takes no arguments. */
		clear: Record<string, never>;
	};
}

/**
 * The persisted state shape for every capability, keyed by capability name.
 * The keys of this interface also define the set of valid capability names.
 */
export interface CapabilityStates {
	info: InfoState;
	counter: CounterState;
	switch: SwitchState;
	status: StatusCapabilityState;
	activity: ActivityState;
}

/** Union of all capability names (e.g. `"info" | "counter" | ...`). */
export type CapabilityName = keyof CapabilityStates;

/**
 * Persisted state for a single capability.
 *
 * @typeParam N - The capability name.
 */
export type CapabilityState<N extends CapabilityName> = CapabilityStates[N];

/**
 * Union of method names available on a capability (e.g. for `counter`:
 * `"set" | "increment" | "reset"`).
 *
 * @typeParam N - The capability name.
 */
export type CapabilityMethod<N extends CapabilityName> =
	keyof CapabilityMethodArgs[N] & string;

/**
 * The `data` payload type for a specific capability method.
 *
 * @typeParam N - The capability name.
 * @typeParam M - The method name on capability `N`.
 */
export type MethodArgs<
	N extends CapabilityName,
	M extends CapabilityMethod<N>,
> = CapabilityMethodArgs[N][M];

/**
 * A partial map of capability name to its persisted state — i.e. an object's
 * full state where any capability may be absent.
 */
export type CapabilitiesBlob = {
	[N in CapabilityName]?: CapabilityState<N>;
};
