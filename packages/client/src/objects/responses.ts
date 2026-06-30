/**
 * Response shapes returned by the object webhook receiver — both the JSON
 * bodies (`*ResponseBody`) and the full HTTP responses with status codes
 * (`*Response`).
 *
 * @module
 */
import type { DeclaredCapabilitiesState, PresetName } from "./presets";

/** Applied via the live game server (space loaded). */
export type DispatchedResponseBody = {
	status: "dispatched";
};

/** Applied via direct DB write (space not loaded) — same effect as `dispatched`. */
export type SpaceIdleResponseBody = {
	status: "space_idle";
};

/** Success for capability events. A deduped redelivery also returns HTTP 200 with one of these. */
export type DispatchSuccessResponseBody =
	| DispatchedResponseBody
	| SpaceIdleResponseBody;

/**
 * Success for `webhook.ping` only — echoes the object's declared capability state.
 *
 * @typeParam P - The object's preset, or `null` when unknown. When a concrete
 * preset is supplied, `capabilities` is fully materialized; otherwise it is a
 * partial map across all presets' capabilities.
 */
export type PingResponseBody<P extends PresetName | null = PresetName | null> =
	{
		/** Always `"pong"`. */
		status: "pong";
		/** The responding object's id. */
		objectId: string;
		/** The space the object belongs to. */
		spaceId: string;
		/** The object's preset, or `null` if not determinable. */
		preset: P;
		/** Declared capability state, materialized per {@link DeclaredCapabilitiesState}. */
		capabilities: P extends PresetName
			? DeclaredCapabilitiesState<P>
			: Partial<DeclaredCapabilitiesState<PresetName>>;
	};

/**
 * All HTTP-200 JSON bodies, discriminated by `status`.
 *
 * @typeParam P - The object's preset (forwarded to {@link PingResponseBody}).
 */
export type WebhookSuccessResponseBody<
	P extends PresetName | null = PresetName | null,
> = DispatchSuccessResponseBody | PingResponseBody<P>;

/** The success body returned from {@link Client.send} (a dispatched capability event). */
export type WebhookEventResponseBody = DispatchSuccessResponseBody;

/** Every error code the receiver can return, as a readonly tuple. */
export const WEBHOOK_ERROR_CODES = [
	"invalid_request",
	"invalid_args",
	"not_found",
	"capability_not_found",
	"capability_not_declared",
	"method_not_found",
	"token_revoked",
	"unsupported_media_type",
	"internal_error",
	"service_unavailable",
] as const;

/** A single error code — the union derived from {@link WEBHOOK_ERROR_CODES}. */
export type WebhookErrorCode = (typeof WEBHOOK_ERROR_CODES)[number];

/** Every error response body: `{ "error": "<code>" }`. */
export type WebhookErrorResponseBody = {
	error: WebhookErrorCode;
};

/**
 * Post-auth error codes — receiving one of these means HMAC verification already succeeded.
 * `not_found` is deliberately excluded: it collapses every pre-auth failure (bad signature,
 * unknown object, missing token, etc.) and is indistinguishable from a missing object.
 */
export type PostAuthWebhookErrorCode = Exclude<
	WebhookErrorCode,
	"not_found" | "unsupported_media_type"
>;

/** Error responses paired with their HTTP status codes. */
export type WebhookErrorResponse =
	| {
			status: 400;
			body: {
				error: "invalid_request" | "invalid_args";
			};
	  }
	| {
			status: 404;
			body: {
				error:
					| "not_found"
					| "capability_not_found"
					| "capability_not_declared"
					| "method_not_found";
			};
	  }
	| { status: 410; body: { error: "token_revoked" } }
	| { status: 415; body: { error: "unsupported_media_type" } }
	| { status: 500; body: { error: "internal_error" } }
	| { status: 503; body: { error: "service_unavailable" } };

/**
 * Rate limit (100 req/min per IP, 60 req/min per space). Emitted by the framework, not the
 * webhook handler — body shape is not `{ error: "..." }`. Honor `RateLimit-Reset` (Unix seconds).
 */
export type WebhookRateLimitedResponse = {
	status: 429;
	body?: unknown;
};

/**
 * A successful HTTP 200 response (status + body).
 *
 * @typeParam P - The object's preset (forwarded to the body type).
 */
export type WebhookHttpSuccessResponse<
	P extends PresetName | null = PresetName | null,
> = {
	status: 200;
	body: WebhookSuccessResponseBody<P>;
};

/**
 * Full HTTP response union for the object webhook receiver — success, error,
 * or rate-limited.
 *
 * @typeParam P - The object's preset (forwarded to the success body type).
 */
export type WebhookHttpResponse<
	P extends PresetName | null = PresetName | null,
> =
	| WebhookHttpSuccessResponse<P>
	| WebhookErrorResponse
	| WebhookRateLimitedResponse;

/**
 * JSON body only (no HTTP status), success or error.
 *
 * @typeParam P - The object's preset (forwarded to the success body type).
 */
export type WebhookResponseBody<
	P extends PresetName | null = PresetName | null,
> = WebhookSuccessResponseBody<P> | WebhookErrorResponseBody;
