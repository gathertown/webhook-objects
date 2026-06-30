/** Max lengths enforced on every write path. */
export const WEBHOOK_OBJECT_NAME_MAX_LENGTH = 120;
export const WEBHOOK_OBJECT_DESCRIPTION_MAX_LENGTH = 2000;

export const ACTIVITY_BUFFER_SIZE = 20;
export const ACTIVITY_ID_MAX_LENGTH = 128;
export const ACTIVITY_TEXT_MAX_LENGTH = 500;
export const ACTIVITY_URL_MAX_LENGTH = 2048;

export const STATUS_STATES = [
	"off",
	"on",
	"question",
	"alert",
	"working",
] as const;

export type StatusState = (typeof STATUS_STATES)[number];

export type InfoState = {
	name?: string;
	description?: string;
};

export type CounterState = {
	count: number | null;
};

export type SwitchState = {
	on: boolean;
};

export type StatusCapabilityState = {
	state: StatusState;
};

export type ActivityEntry = {
	id: string;
	at: number;
	text: string;
	url?: string;
};

export type ActivityState = {
	entries: ActivityEntry[];
};

/** Method argument shapes keyed by capability and method name. */
export interface CapabilityMethodArgs {
	info: {
		set: {
			name?: string;
			description?: string;
		};
	};
	counter: {
		set: {
			count: number;
		};
		increment: {
			by?: number;
		};
		reset: Record<string, never>;
	};
	switch: {
		set_state: {
			on: boolean;
		};
		toggle: Record<string, never>;
	};
	status: {
		set: {
			state: StatusState;
		};
		reset: Record<string, never>;
	};
	activity: {
		add: {
			id: string;
			text: string;
			url?: string;
		};
		remove: {
			id: string;
		};
		clear: Record<string, never>;
	};
}

/** Persisted capability state shapes keyed by capability name. */
export interface CapabilityStates {
	info: InfoState;
	counter: CounterState;
	switch: SwitchState;
	status: StatusCapabilityState;
	activity: ActivityState;
}

export type CapabilityName = keyof CapabilityStates;

export type CapabilityState<N extends CapabilityName> = CapabilityStates[N];

export type CapabilityMethod<N extends CapabilityName> =
	keyof CapabilityMethodArgs[N] & string;

export type MethodArgs<
	N extends CapabilityName,
	M extends CapabilityMethod<N>,
> = CapabilityMethodArgs[N][M];

export type CapabilitiesBlob = {
	[N in CapabilityName]?: CapabilityState<N>;
};
