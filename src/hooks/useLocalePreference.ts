import { useCallback, useState } from 'react'
import { detectLocale } from '../utils/detectLocale'
import { SUPPORTED_LOCALES, isSupportedLocale } from '../i18n/locales'

const STORAGE_KEY = 'locale'

export function useLocalePreference() {
  const [locale, setLocale] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && isSupportedLocale(stored)) return stored
    if (stored) localStorage.removeItem(STORAGE_KEY)
    return detectLocale(SUPPORTED_LOCALES)
  })

  const setLocalePreference = useCallback((newLocale: string) => {
    if (newLocale === detectLocale(SUPPORTED_LOCALES)) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, newLocale)
    }
    setLocale(newLocale)
  }, [])

  return [locale, setLocalePreference] as const
}
