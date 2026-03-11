import { describe, it, expect, vi, afterEach } from 'vitest'
import { detectLocale } from './detectLocale'

const supported = [
  'en', 'ar', 'cs', 'cy', 'da', 'de', 'el', 'es', 'es-ES', 'fa', 'fi', 'fr',
  'he', 'hr', 'hu', 'hy', 'ja', 'ko', 'mi', 'nb', 'nl', 'pl', 'pt', 'pt-BR',
  'ro', 'ru', 'sk', 'sl', 'sv', 'th', 'tr', 'uk', 'vi', 'zh-Hans', 'zh-Hant',
]

function mockLanguages(languages: string[]) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('detectLocale', () => {
  it('returns exact match', () => {
    mockLanguages(['es'])
    expect(detectLocale(supported)).toBe('es')
  })

  it('returns exact match for hyphenated locale in supported list', () => {
    mockLanguages(['es-ES'])
    expect(detectLocale(supported)).toBe('es-ES')
  })

  it('strips subtags for prefix match', () => {
    mockLanguages(['es-MX'])
    expect(detectLocale(supported)).toBe('es')
  })

  it('strips multi-subtag locale correctly', () => {
    mockLanguages(['zh-Hans-CN'])
    expect(detectLocale(supported)).toBe('zh-Hans')
  })

  it('picks first preference that matches', () => {
    mockLanguages(['fr', 'de'])
    expect(detectLocale(supported)).toBe('fr')
  })

  it('falls through to second preference when first has no match', () => {
    mockLanguages(['xx-XX', 'de'])
    expect(detectLocale(supported)).toBe('de')
  })

  it('falls back to en when no preference matches', () => {
    mockLanguages(['xx', 'yy'])
    expect(detectLocale(supported)).toBe('en')
  })

  it('strips en-AU to en', () => {
    mockLanguages(['en-AU'])
    expect(detectLocale(supported)).toBe('en')
  })

  it('strips en-GB to en', () => {
    mockLanguages(['en-GB'])
    expect(detectLocale(supported)).toBe('en')
  })
})
