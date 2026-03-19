import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import fallback from '../i18n/en.json'
import { RTL_LOCALES } from '../i18n/locales'

type AppTranslationsValue = {
  t: (key: string, params?: Record<string, string | number>) => string
  isRtl: boolean
  isLoading: boolean
}

const AppTranslationsContext = createContext<AppTranslationsValue | null>(null)

function extractStringRecord(mod: unknown): Record<string, string> | null {
  const obj = typeof mod === 'object' && mod !== null && 'default' in mod
    ? (mod as { default: unknown }).default
    : mod
  if (typeof obj !== 'object' || obj === null) return null
  const record = obj as Record<string, unknown>
  if (!Object.values(record).every(v => typeof v === 'string')) return null
  return record as Record<string, string>
}

async function fetchLocaleStrings(locale: string): Promise<Record<string, string>> {
  const mod: unknown = await import(`../i18n/${locale}.json`)
  const strings = extractStringRecord(mod)
  if (!strings) throw new Error('Invalid locale file')
  return strings
}

type AppTranslationsProviderProps = {
  locale: string
  children: ReactNode
}

export function AppTranslationsProvider({ locale, children }: AppTranslationsProviderProps) {
  const { data: translations, isPlaceholderData } = useQuery({
    queryKey: ['appTranslations', locale],
    queryFn: () => fetchLocaleStrings(locale),
    enabled: locale !== 'en',
    placeholderData: (previousData) => previousData ?? fallback,
  })

  const isLoading = locale !== 'en' && isPlaceholderData
  const isRtl = (RTL_LOCALES as readonly string[]).includes(locale)

  const value = useMemo<AppTranslationsValue>(() => {
    const strings: Record<string, string> = locale === 'en' ? fallback : (translations ?? fallback)

    function t(key: string, params?: Record<string, string | number>): string {
      let value = strings[key] ?? (fallback as Record<string, string>)[key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.split(`{{${k}}}`).join(String(v))
        }
      }
      return value
    }

    return { t, isRtl, isLoading }
  }, [locale, translations, isRtl, isLoading])

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
