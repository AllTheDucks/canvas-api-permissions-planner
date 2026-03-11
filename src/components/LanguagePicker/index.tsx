import { Select } from '@mantine/core'
import { SUPPORTED_LOCALES, LOCALE_NAMES } from '../../i18n/locales'
import type { SupportedLocale } from '../../i18n/locales'
import { useAppTranslations } from '../../context/AppTranslationsContext'

type LanguagePickerProps = {
  value: string
  onChange: (locale: string) => void
}

const options = SUPPORTED_LOCALES.map((code) => ({
  value: code,
  label: LOCALE_NAMES[code as SupportedLocale],
}))

export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  const { t } = useAppTranslations()

  return (
    <Select
      aria-label={t('language.label')}
      data={options}
      value={value}
      onChange={(val) => { if (val) onChange(val) }}
      w={180}
      size="xs"
      allowDeselect={false}
      searchable
    />
  )
}
