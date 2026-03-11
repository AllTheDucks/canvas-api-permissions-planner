import { useEffect } from 'react'
import { loadSupplementalFont } from '../utils/supplementalFont'

export function useLocaleSync(locale: string, isRtl: boolean) {
  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
  }, [isRtl])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    const family = loadSupplementalFont(locale)
    if (family) {
      document.documentElement.style.setProperty(
        '--mantine-font-family',
        `'${family}', Poppins, sans-serif`,
      )
      document.documentElement.style.setProperty(
        '--mantine-font-family-headings',
        `'${family}', 'Source Sans 3', sans-serif`,
      )
    } else {
      document.documentElement.style.removeProperty('--mantine-font-family')
      document.documentElement.style.removeProperty('--mantine-font-family-headings')
    }
  }, [locale])
}
