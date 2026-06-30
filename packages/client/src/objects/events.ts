/**
 * Webhook event payloads — the JSON bodies posted to an object's webhook URL.
 *
 * Events are addressed as `"<capability>.<method>"` and carry a `data` payload
 * whose shape is derived from {@link CapabilityMethodArgs}. The `webhook.ping`
 * probe is modeled separately as {@link PingEvent}.
 *
 * @module
 */
import type {
	CapabilityMethod,
	CapabilityName,
	MethodArgs,
} from "./capabilities";
import type { PresetCapabilityName, PresetName } from "./presets";

/** The reserved event type for the metadata/health probe. */
export const PING_EVENT_TYPE = "webhook.ping" as const;

/**
 * The `webhook.ping` probe event. Carries no meaningful payload; `data`, when
 * present, must be an empty object.
 */
export type PingEvent = {
	type: typeof PING_EVENT_TYPE;
	data?: Record<string, never>;
};

/**
 * A single capability event on the wire: `type` is `"<capability>.<method>"`
 * and `data` is the matching method-argument payload.
 *
 * @typeParam N - The capability name.
 * @typeParam M - The method name on capability `N`.
 */
export type CapabilityWebhookEvent<
	N extends CapabilityName,
	M extends CapabilityMethod<N>,
> = {
	/** Wire type, formatted as `` `${N}.${M}` ``. */
	type: `${N}.${M}`;
	/** ISO-8601 timestamp of when the event was produced. */
	timestamp: string;
	/** Method-argument payload for `N.M`. */
	data: MethodArgs<N, M>;
};

/**
 * Union of every event for a single capability (across all of its methods).
 *
 * @typeParam N - The capability name.
 */
export type CapabilityWebhookEventFor<N extends CapabilityName> = {
	[M in CapabilityMethod<N>]: CapabilityWebhookEvent<N, M>;
}[CapabilityMethod<N>];

/** Any capability event on the wire (excludes reserved `webhook.*` methods). */
export type CapabilityWebhookEventUnion = {
	[N in CapabilityName]: CapabilityWebhookEventFor<N>;
}[CapabilityName];

/** Standard Webhooks payload shape posted to the object URL. */
export type WebhookEvent = CapabilityWebhookEventUnion;

/**
 * Union of capability events for the capabilities a given preset declares.
 *
 * @typeParam P - The preset name.
 */
export type PresetCapabilityWebhookEvent<P extends PresetName> = {
	[N in PresetCapabilityName<P>]: CapabilityWebhookEventFor<N>;
}[PresetCapabilityName<P>];

/** Events a placed object of `preset` accepts, plus the universal ping probe. */
export type PresetWebhookEvent<P extends PresetName> =
	PresetCapabilityWebhookEvent<P>;

/**
 * Recover the `data` payload type from a wire `type` string.
 *
 * @typeParam T - A wire event type, e.g. `"counter.set"`.
 * @example
 * type SetArgs = EventDataForType<"counter.set">; // { count: number }
 */
export type EventDataForType<T extends WebhookEvent["type"]> = Extract<
	CapabilityWebhookEventUnion,
	{ type: T }
>["data"];
