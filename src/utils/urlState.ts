export type UrlState = {
  version: string
  selectionEncoded: string
}

// XOR mask to scatter zero-heavy bitmasks into less suspicious-looking base64.
// 64 bytes covers up to 512 endpoints. If the endpoint count grows beyond that,
// trailing bytes are unmasked — the only consequence is a run of 'A's at the end.
const XOR_MASK = new Uint8Array([
  0x4b, 0x91, 0xe3, 0x27, 0xd5, 0x6a, 0xf8, 0x1c, 0xb3, 0x47,
  0x82, 0x5e, 0xa9, 0x34, 0xc6, 0x7f, 0x15, 0xd8, 0x63, 0xea,
  0x2d, 0x96, 0x41, 0xbc, 0x58, 0xe7, 0x0a, 0xf3, 0x69, 0x84,
  0xce, 0x3b, 0x72, 0xa5, 0x1d, 0xd4, 0x8f, 0x56, 0x3a, 0xc1,
  0x7d, 0x48, 0xb6, 0x29, 0xe5, 0x93, 0x14, 0xfa, 0x67, 0x8b,
  0xd2, 0x3e, 0xa0, 0x5c, 0x79, 0xb8, 0x46, 0x01, 0xed, 0x53,
  0x9f, 0x2a, 0xc4, 0x75,
])

function applyMask(bytes: Uint8Array): void {
  for (let i = 0; i < bytes.length && i < XOR_MASK.length; i++) {
    bytes[i] ^= XOR_MASK[i]
  }
}

export function encodeSelection(selectedIndices: number[], endpointCount: number): string {
  const bytes = new Uint8Array(Math.ceil(endpointCount / 8))
  for (const i of selectedIndices) {
    bytes[i >> 3] |= 1 << (i & 7)
  }
  applyMask(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function decodeSelection(encoded: string): number[] {
  const raw = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  applyMask(bytes)

  const indices: number[] = []
  for (let i = 0; i < bytes.length * 8; i++) {
    if (bytes[i >> 3] & (1 << (i & 7))) indices.push(i)
  }
  return indices
}

export function readUrlParams(): UrlState | null {
  const params = new URLSearchParams(window.location.search)
  const version = params.get('v')
  const selection = params.get('s')

  if (!version || !selection) return null

  return { version, selectionEncoded: selection }
}
