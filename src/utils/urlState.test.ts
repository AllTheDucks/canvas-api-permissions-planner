import { describe, it, expect, beforeEach } from 'vitest'
import { encodeSelection, decodeSelection, readUrlParams } from './urlState'

describe('encodeSelection / decodeSelection', () => {
  it('round-trips a set of indices', () => {
    const indices = [0, 5, 10, 42, 99, 200]
    const encoded = encodeSelection(indices, 300)
    const decoded = decodeSelection(encoded)
    expect(decoded).toEqual(indices)
  })

  it('round-trips an empty selection', () => {
    const encoded = encodeSelection([], 300)
    expect(encoded).toBeTruthy()
    const decoded = decodeSelection(encoded)
    expect(decoded).toEqual([])
  })

  it('round-trips a single endpoint at index 0', () => {
    const encoded = encodeSelection([0], 300)
    const decoded = decodeSelection(encoded)
    expect(decoded).toEqual([0])
  })

  it('round-trips a single endpoint at the highest index (299)', () => {
    const encoded = encodeSelection([299], 300)
    const decoded = decodeSelection(encoded)
    expect(decoded).toEqual([299])
  })

  it('round-trips all endpoints selected', () => {
    const all = Array.from({ length: 300 }, (_, i) => i)
    const encoded = encodeSelection(all, 300)
    const decoded = decodeSelection(encoded)
    expect(decoded).toEqual(all)
  })

  it('produces only URL-safe base64 characters', () => {
    const indices = [1, 50, 100, 150, 200, 250, 299]
    const encoded = encodeSelection(indices, 300)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')
  })

  it('handles a small endpoint count', () => {
    const encoded = encodeSelection([0, 2, 4], 5)
    const decoded = decodeSelection(encoded)
    expect(decoded).toEqual([0, 2, 4])
  })
})

describe('readUrlParams', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', window.location.pathname)
  })

  it('returns null when no query params present', () => {
    expect(readUrlParams()).toBeNull()
  })

  it('returns null when v is missing', () => {
    window.history.replaceState(null, '', '?s=AAAA')
    expect(readUrlParams()).toBeNull()
  })

  it('returns null when s is missing', () => {
    window.history.replaceState(null, '', '?v=2026-03-03')
    expect(readUrlParams()).toBeNull()
  })

  it('returns UrlState when both v and s are present', () => {
    window.history.replaceState(null, '', '?v=2026-03-03&s=AQAAAA')
    const result = readUrlParams()
    expect(result).toEqual({
      version: '2026-03-03',
      selectionEncoded: 'AQAAAA',
    })
  })
})
