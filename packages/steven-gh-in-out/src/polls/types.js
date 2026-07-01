/**
 * @typedef {object} PollContext
 * @property {{ owner: string, repo: string, token: string, login: string }} github
 */

/**
 * @typedef {object} PollResult
 * @property {string} pollId Stable id for logs and future publishers.
 * @property {string} label Human-readable poll name for logs.
 * @property {number} value Numeric metric driving publishers (e.g. slot count).
 */

/**
 * @typedef {(ctx: PollContext) => Promise<PollResult>} Poll
 */

export {}
