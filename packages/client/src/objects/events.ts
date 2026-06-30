import type {
	CapabilityMethod,
	CapabilityName,
	MethodArgs,
} from "./capabilities";
import type { PresetCapabilityName, PresetName } from "./presets";

export const PING_EVENT_TYPE = "webhook.ping" as const;

export type PingEvent = {
	type: typeof PING_EVENT_TYPE;
	data?: Record<string, never>;
};

export type CapabilityWebhookEvent<
	N extends CapabilityName,
	M extends CapabilityMethod<N>,
> = {
	type: `${N}.${M}`;
	timestamp: string;
	data: MethodArgs<N, M>;
};

export type CapabilityWebhookEventFor<N extends CapabilityName> = {
	[M in CapabilityMethod<N>]: CapabilityWebhookEvent<N, M>;
}[CapabilityMethod<N>];

/** Any capability event on the wire (excludes reserved `webhook.*` methods). */
export type CapabilityWebhookEventUnion = {
	[N in CapabilityName]: CapabilityWebhookEventFor<N>;
}[CapabilityName];

/** Standard Webhooks payload shape posted to the object URL. */
export type WebhookEvent = CapabilityWebhookEventUnion;

export type PresetCapabilityWebhookEvent<P extends PresetName> = {
	[N in PresetCapabilityName<P>]: CapabilityWebhookEventFor<N>;
}[PresetCapabilityName<P>];

/** Events a placed object of `preset` accepts, plus the universal ping probe. */
export type PresetWebhookEvent<P extends PresetName> =
	PresetCapabilityWebhookEvent<P>;

/** Recover the `data` payload type from a wire `type` string. */
export type EventDataForType<T extends WebhookEvent["type"]> = Extract<
	CapabilityWebhookEventUnion,
	{ type: T }
>["data"];
