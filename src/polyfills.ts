import { Buffer } from 'buffer'

/** isomorphic-git internally reaches for Node's global Buffer (git index encoding, hashing, etc.)
 * which the browser doesn't have — Vite doesn't auto-polyfill Node globals like webpack used to. */
if (!('Buffer' in globalThis)) {
  ;(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer
}
