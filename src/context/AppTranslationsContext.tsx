import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import fallback from '../i18n/en.json'
import { RTL_LOCALES } from '../i18n/locales'

type AppTranslationsValue = {
  t: (key: string, params?: Record<string, string | number>) => string
  isRtl: boolean
}

const AppTranslationsContext = createContext<AppTranslationsValue | null>(null)

const localeCache = new Map<string, Record<string, string>>()

function extractStringRecord(mod: unknown): Record<string, string> | null {
  const obj = typeof mod === 'object' && mod !== null && 'default' in mod
    ? (mod as { default: unknown }).default
    : mod
  if (typeof obj !== 'object' || obj === null) return null
  const record = obj as Record<string, unknown>
  if (!Object.values(record).every(v => typeof v === 'string')) return null
  return record as Record<string, string>
}

type AppTranslationsProviderProps = {
  locale: string
  children: ReactNode
}

export function AppTranslationsProvider({ locale, children }: AppTranslationsProviderProps) {
  const [translations, setTranslations] = useState<Record<string, string>>(
    locale === 'en' ? fallback : (localeCache.get(locale) ?? fallback),
  )

  useEffect(() => {
    if (locale === 'en') {
      setTranslations(fallback)
      return
    }

    const cached = localeCache.get(locale)
    if (cached) {
      setTranslations(cached)
      return
    }

    let cancelled = false

    import(`../i18n/${locale}.json`)
      .then((mod: unknown) => {
        const strings = extractStringRecord(mod)
        if (!strings) throw new Error('Invalid locale file')
        localeCache.set(locale, strings)
        if (!cancelled) setTranslations(strings)
      })
      .catch(() => {
        if (!cancelled) setTranslations(fallback)
      })

    return () => { cancelled = true }
  }, [locale])

  const isRtl = (RTL_LOCALES as readonly string[]).includes(locale)

  const value = useMemo<AppTranslationsValue>(() => {
    function t(key: string, params?: Record<string, string | number>): string {
      let value = translations[key] ?? (fallback as Record<string, string>)[key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.split(`{{${k}}}`).join(String(v))
        }
      }
      return value
    }

    return { t, isRtl }
  }, [translations, isRtl])

  return (
    <AppTranslationsContext.Provider value={value}>
      {children}
    </AppTranslationsContext.Provider>
  )
}

export function useAppTranslations(): AppTranslationsValue {
  const ctx = useContext(AppTranslationsContext)
  if (!ctx) throw new Error('useAppTranslations must be used within AppTranslationsProvider')
  return ctx
}
