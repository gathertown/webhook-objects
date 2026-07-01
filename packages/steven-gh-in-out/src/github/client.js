const GITHUB_API = "https://api.github.com"

export const PR_CUTOFF_DAYS = 14
export const REVIEW_REQUEST_CUTOFF_DAYS = 7

/**
 * @typedef {{ id: number, number: number, title: string, html_url: string }} GitHubPullRequest
 */

/** @param {number} days */
export function cutoffSinceDate(days) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return cutoff.toISOString().slice(0, 10)
}

/** @returns {string} YYYY-MM-DD for GitHub `created:>=` search qualifier */
export function prCreatedSinceDate() {
  return cutoffSinceDate(PR_CUTOFF_DAYS)
}

/** @returns {string} YYYY-MM-DD — last week for review-requested PR search */
export function reviewRequestSinceDate() {
  return cutoffSinceDate(REVIEW_REQUEST_CUTOFF_DAYS)
}

/**
 * @param {string} token
 */
export function githubHeaders(token) {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
  }
}

/**
 * @param {string} token
 * @returns {Promise<string>}
 */
export async function fetchGitHubLogin(token) {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: githubHeaders(token),
  })
  if (!res.ok) {
    throw new Error(`GitHub /user failed (${res.status}): ${await res.text()}`)
  }
  const user = await res.json()
  if (!user.login) {
    throw new Error("GitHub /user response missing login")
  }
  return user.login
}

/**
 * @param {string} token
 * @param {string} query
 * @param {{ perPage?: number }} [options]
 * @returns {Promise<GitHubPullRequest[]>}
 */
export async function searchIssues(token, query, { perPage = 100 } = {}) {
  const url = new URL("/search/issues", GITHUB_API)
  url.searchParams.set("q", query)
  url.searchParams.set("per_page", String(perPage))

  const res = await fetch(url, { headers: githubHeaders(token) })
  if (!res.ok) {
    throw new Error(`GitHub search failed (${res.status}): ${await res.text()}`)
  }
  const payload = await res.json()
  return payload.items ?? []
}

/**
 * Open, ready-for-review PRs you opened or are assigned to. Search API rejects
 * OR on user qualifiers, so merge author + assignee results and dedupe.
 *
 * @param {string} token
 * @param {{ owner: string, repo: string, login: string }} target
 * @returns {Promise<GitHubPullRequest[]>}
 */
export async function listOpenPrsForUser(token, { owner, repo, login }) {
  const createdSince = prCreatedSinceDate()
  const base = `repo:${owner}/${repo} is:pr is:open draft:false created:>=${createdSince}`
  const [authored, assigned] = await Promise.all([
    searchIssues(token, `${base} author:${login}`),
    searchIssues(token, `${base} assignee:${login}`),
  ])

  const byId = new Map()
  for (const item of [...authored, ...assigned]) {
    byId.set(item.id, item)
  }

  return [...byId.values()].sort((a, b) => a.number - b.number)
}

/**
 * Open PRs that directly requested you as a reviewer (not via a team), not yet
 * approved by anyone, created in the last week.
 *
 * @param {string} token
 * @param {{ owner: string, repo: string, login: string }} target
 * @returns {Promise<GitHubPullRequest[]>}
 */
export async function listOpenReviewRequestedPrsForUser(token, { owner, repo, login }) {
  const since = reviewRequestSinceDate()
  const query = `repo:${owner}/${repo} is:pr is:open user-review-requested:${login} -review:approved created:>=${since}`
  const items = await searchIssues(token, query)
  return items.sort((a, b) => a.number - b.number)
}

/**
 * @param {string} token
 * @param {{ owner: string, repo: string, login: string }} target
 * @returns {Promise<number>}
 */
export async function countOpenPrsForUser(token, target) {
  const prs = await listOpenPrsForUser(token, target)
  return prs.length
}
