import { randomUUID } from "node:crypto"
import { Webhook } from "standardwebhooks"

const WHSEC_PATTERN = /^whsec_.{20,}/

export function createSmartObjectSender(url, secret) {
  if (!WHSEC_PATTERN.test(secret ?? "")) {
    throw new Error(`Smart Object secret for ${url} is missing or malformed`)
  }

  const webhook = new Webhook(secret)

  return async function send(type, data = {}) {
    const id = randomUUID()
    const tsSeconds = Math.floor(Date.now() / 1000)
    const body = JSON.stringify({ type, timestamp: new Date().toISOString(), data })
    const signature = webhook.sign(id, new Date(tsSeconds * 1000), body)

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": id,
        "webhook-timestamp": String(tsSeconds),
        "webhook-signature": signature,
      },
      body,
    })

    if (res.status === 429) {
      const reset = Number(res.headers.get("RateLimit-Reset")) * 1000
      await new Promise((r) => setTimeout(r, Math.max(0, reset - Date.now()) + 250))
      return send(type, data)
    }

    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
    return res.json()
  }
}
