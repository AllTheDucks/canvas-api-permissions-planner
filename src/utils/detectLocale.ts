export function detectLocale(supportedLocales: readonly string[]): string {
  const supported = new Set(supportedLocales)
  for (const browserLocale of navigator.languages ?? [navigator.language]) {
    const parts = browserLocale.split('-')
    for (let len = parts.length; len >= 1; len--) {
      const candidate = parts.slice(0, len).join('-')
      if (supported.has(candidate)) return candidate
    }
  }
  return 'en'
}
