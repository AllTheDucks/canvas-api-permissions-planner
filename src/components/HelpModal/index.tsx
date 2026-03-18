import { lazy, Suspense, useState } from 'react'
import { ActionIcon, Tooltip } from '@mantine/core'
import { IconQuestionMark } from '@tabler/icons-react'
import { useAppTranslations } from '../../context/AppTranslationsContext'
import { trackEvent } from '../../utils/analytics'

const HelpModalContent = lazy(() => import('./HelpModalContent'))

export function HelpModal() {
  const [opened, setOpened] = useState(false)
  const { t } = useAppTranslations()

  return (
    <>
      <Tooltip label={t('header.help')}>
        <ActionIcon
          variant="default"
          size="lg"
          aria-label={t('header.help')}
          onClick={() => { trackEvent('help_opened'); setOpened(true) }}
        >
          <IconQuestionMark size={18} />
        </ActionIcon>
      </Tooltip>

      {opened && (
        <Suspense>
          <HelpModalContent opened={opened} onClose={() => setOpened(false)} />
        </Suspense>
      )}
    </>
  )
}
