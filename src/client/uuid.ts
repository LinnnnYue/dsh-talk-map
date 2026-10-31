/**
 * Random v4 UUID minted from `crypto.getRandomValues`.
 *
 * `crypto.randomUUID` is a **secure-context** Web API: a page served over
 * plain HTTP on a LAN address (the common dsh deployment: `dsh web --host
 * <lan-ip>` with no TLS) has no such method, and calling it throws a
 * TypeError. `getRandomValues` is available in every context the client half
 * runs in (browser, worker, Node ≥ 19).
 *
 * This mirrors `@deepseek-ai/dsh-util-crypto`, which exists for exactly this
 * reason — it is not imported here because this plugin keeps zero
 * `@deepseek-ai/*` runtime imports (those packages have no installable
 * directory in a dsh deployment; only their bundled client artifacts exist).
 */

/**
 * @returns a canonical v4 UUID string.
 */
export function randomUUID(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  // RFC 4122: version 4 in the high nibble of byte 6, variant 10xx in byte 8.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
