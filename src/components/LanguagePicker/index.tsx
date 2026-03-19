import { ActionIcon, Group, Loader, Select, Tooltip } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { SUPPORTED_LOCALES, LOCALE_NAMES } from '../../i18n/locales'
import type { SupportedLocale } from '../../i18n/locales'
import { useAppTranslations } from '../../context/AppTranslationsContext'
import { trackEvent } from '../../utils/analytics'

type LanguagePickerProps = {
  value: string
  onChange: (locale: string) => void
  loading?: boolean
}

const options = SUPPORTED_LOCALES.map((code) => ({
  value: code,
  label: LOCALE_NAMES[code as SupportedLocale],
}))

export function LanguagePicker({ value, onChange, loading = false }: LanguagePickerProps) {
  const { t } = useAppTranslations()

  return (
    <Group gap={4} wrap="nowrap">
      <Select
        aria-label={t('language.label')}
        data={options}
        value={value}
        onChange={(val) => { if (val) { trackEvent('locale_changed', { locale: val }); onChange(val) } }}
        w={180}
        size="xs"
        allowDeselect={false}
        searchable
        rightSection={loading ? <Loader size={14} /> : undefined}
      />
      <Tooltip label={t('language.tooltip')} multiline maw={300} withArrow>
        <ActionIcon size="sm" variant="transparent" component="span" style={{ cursor: 'help' }} aria-label={t('common.moreInfo')}>
          <IconInfoCircle size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  )
}
