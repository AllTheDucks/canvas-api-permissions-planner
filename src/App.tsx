import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ActionIcon, Center, Container, Divider, Grid, Group, Loader, Paper, Stack, Text, Title, Tooltip, VisuallyHidden } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconClipboard, IconLink, IconPrinter } from '@tabler/icons-react'
import AtdLogo from './assets/atd-logo.svg?react'
import AtdLogoIcon from './assets/atd-logo-icon.svg?react'
import { useEndpoints } from './hooks/useEndpoints'
import { useLocale } from './hooks/useLocale'
import { useLocalePreference } from './hooks/useLocalePreference'
import { useUrlSelection } from './hooks/useUrlSelection'
import { useLocaleSync } from './hooks/useLocaleSync'
import { EndpointSelector } from './components/EndpointSelector'
import { EndpointPaste } from './components/EndpointPaste'
import { SelectedEndpoints } from './components/SelectedEndpoints'
import { PermissionsResult } from './components/PermissionsResult'
import { ColorSchemeToggle } from './components/ColorSchemeToggle'
import { LanguagePicker } from './components/LanguagePicker'
import { HelpModal } from './components/HelpModal'
import { AppTranslationsProvider, useAppTranslations } from './context/AppTranslationsContext'
import { aggregatePermissions } from './utils/permissionAggregator'
import { formatPermissionsMarkdown } from './utils/formatPermissionsMarkdown'
import type { Endpoint, PermissionRef } from './types'
import classes from './App.module.css'

type ReadyContentProps = {
  allPermissions: Record<string, PermissionRef>
  endpointList: Endpoint[]
  locale: string
  dataVersion: string
  onLocaleLoadingChange: (loading: boolean) => void
  onCopyMarkdownReady: (fn: (() => string) | null) => void
}

function ReadyContent({ allPermissions, endpointList, locale, dataVersion, onLocaleLoadingChange, onCopyMarkdownReady }: ReadyContentProps) {
  const { t } = useAppTranslations()
  const { localeLabels, isLoading: localeLoading } = useLocale(locale, allPermissions, dataVersion)

  useEffect(() => {
    onLocaleLoadingChange(localeLoading)
  }, [localeLoading, onLocaleLoadingChange])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { selectedEndpoints, handleToggle, handleAddMany, handleBulkToggle } = useUrlSelection(endpointList, dataVersion)
  const deferredSelected = useDeferredValue(selectedEndpoints)

  const aggregated = useMemo(
    () => aggregatePermissions(deferredSelected, allPermissions, localeLabels),
    [deferredSelected, allPermissions, localeLabels],
  )

  useEffect(() => {
    if (deferredSelected.length === 0) {
      onCopyMarkdownReady(null)
      return
    }
    onCopyMarkdownReady(() => formatPermissionsMarkdown(deferredSelected, aggregated, {
      title: t('app.title'),
      selectedHeading: t('selectedEndpoints.heading'),
      requiredHeading: t('permissions.requiredHeading'),
      optionalHeading: t('permissions.optionalHeading'),
      anyOf: t('permissions.anyOf'),
      or: t('permissions.or'),
      credit: t('permissions.markdownCredit', { appTitle: t('app.title') }),
    }, t))
  }, [deferredSelected, aggregated, t, onCopyMarkdownReady])

  return (
    <>
    <div data-print-only>
      <Text fw={700} size="lg" mb={2}>{t('app.title')}</Text>
      <Text data-print-date size="xs" c="dimmed" mb="md">{new Date().toLocaleDateString()}</Text>
    </div>
    <Grid>
      <Grid.Col span={{ base: 12, sm: 5 }}>
        <Stack gap="md">
          <Paper shadow="xs" radius="md" p="md" withBorder className={classes.accentPanel} data-print-hide>
            <Title order={2} size="h4" mb="sm">{t('endpoints.heading')}</Title>
            <EndpointSelector
              endpoints={endpointList}
              selected={selectedEndpoints}
              onToggle={handleToggle}
              onBulkToggle={handleBulkToggle}
              inputRef={searchInputRef}
            />
          </Paper>
          <Paper shadow="xs" radius="md" p="md" withBorder className={classes.accentPanel} data-print-hide>
            <EndpointPaste endpoints={endpointList} onAdd={handleAddMany} />
          </Paper>
          <SelectedEndpoints
            selected={deferredSelected}
            onRemove={handleToggle}
            onRemoveCategory={(endpoints) => handleBulkToggle(endpoints, false)}
          />
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 7 }} data-print-permissions>
        <Paper shadow="xs" radius="md" p="md" withBorder className={classes.accentPanel}>
          <Title order={2} size="h4" mb="sm">{t('permissions.heading')}</Title>
          <PermissionsResult permissions={aggregated} selectedCount={deferredSelected.length} isLoadingLocale={localeLoading} />
        </Paper>
        <Text size="sm" c="dimmed" mt="xl" pt="md" data-print-only style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
          {t('footer.printCreditPrefix')}{' '}
          <AtdLogo height={24} aria-label="All the Ducks" style={{ display: 'inline', verticalAlign: 'middle' }} />
          {' '}{t('footer.printCreditSuffix')}
        </Text>
      </Grid.Col>
    </Grid>
    </>
  )
}

function AppContent({
  locale,
  onLocaleChange,
}: {
  locale: string
  onLocaleChange: (locale: string) => void
}) {
  const endpoints = useEndpoints()
  const { t, isRtl, isLoading: isLoadingUiStrings } = useAppTranslations()
  const [isLoadingCanvasLocale, setIsLoadingCanvasLocale] = useState(false)
  const isInitialLoad = useRef(true)
  const copyMarkdownRef = useRef<(() => string) | null>(null)
  const [hasCopyContent, setHasCopyContent] = useState(false)
  const handleCopyMarkdownReady = useCallback((fn: (() => string) | null) => {
    copyMarkdownRef.current = fn
    setHasCopyContent(fn !== null)
  }, [])
  useLocaleSync(locale, isRtl)

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(
      () => {
        notifications.show({
          message: t('share.copied'),
          autoClose: 3000,
        })
      },
      () => {
        notifications.show({
          color: 'red',
          message: t('share.copyFailed'),
          autoClose: 3000,
        })
      },
    )
  }, [t])

  if (!isLoadingUiStrings && isInitialLoad.current) {
    isInitialLoad.current = false
  }

  if (isLoadingUiStrings && isInitialLoad.current) {
    return <Center h="100vh"><Loader /></Center>
  }

  return (
    <div className={classes.appLayout}>
      <header className={classes.header}>
        <VisuallyHidden><h1>{t('app.title')}</h1></VisuallyHidden>
        <Container size="xl" py="sm">
          <Group justify="space-between">
            <Group gap="sm">
              <a href="https://alltheducks.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                <AtdLogoIcon height={48} aria-label="All the Ducks" />
              </a>
              <Stack gap={0} visibleFrom="sm">
                <Title order={2} size="h3">{t('app.title')}</Title>
                <Text size="xs" c="dimmed" ta="right" pr="xs">from <a href="https://alltheducks.com" target="_blank" rel="noopener noreferrer" className={classes.plainLink}>All the Ducks</a></Text>
              </Stack>
            </Group>
            <Group gap="xs">
              {locale !== 'en' && (
                <Text size="xs" c="dimmed">{t('aiTranslation.note')}</Text>
              )}
              <Tooltip label={t('share.copyLink')} withArrow>
                <ActionIcon
                  onClick={handleCopyLink}
                  aria-label={t('share.copyLink')}
                  variant="subtle"
                  size="lg"
                >
                  <IconLink size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t('permissions.copyMarkdown')} withArrow>
                <ActionIcon
                  onClick={() => {
                    const md = copyMarkdownRef.current?.()
                    if (!md) return
                    navigator.clipboard.writeText(md).then(
                      () => notifications.show({ message: t('permissions.copied'), autoClose: 3000 }),
                      () => notifications.show({ color: 'red', message: t('permissions.copyFailed'), autoClose: 3000 }),
                    )
                  }}
                  aria-label={t('permissions.copyMarkdown')}
                  variant="subtle"
                  size="lg"
                  disabled={!hasCopyContent}
                >
                  <IconClipboard size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={t('share.print')} withArrow>
                <ActionIcon
                  onClick={() => window.print()}
                  aria-label={t('share.print')}
                  variant="subtle"
                  size="lg"
                >
                  <IconPrinter size={18} />
                </ActionIcon>
              </Tooltip>
              <LanguagePicker value={locale} onChange={onLocaleChange} loading={isLoadingUiStrings || isLoadingCanvasLocale} />
              <ColorSchemeToggle />
              <HelpModal />
            </Group>
          </Group>
        </Container>
        <Divider />
      </header>

      <main aria-label={t('app.title')} className={classes.mainContent}>
        <Container size="xl" py="md">
          {endpoints.status === 'loading' && (
            <Center h="60vh"><Loader /></Center>
          )}

          {endpoints.status === 'error' && (
            <Center h="60vh">
              <Stack align="center">
                <Text c="red" fw={500}>{t('error.loadFailed')}</Text>
                <Text size="sm" c="dimmed" maw={400} ta="center">
                  {endpoints.error.message}
                </Text>
              </Stack>
            </Center>
          )}

          {endpoints.status === 'ready' && (
            <ReadyContent
              allPermissions={endpoints.allPermissions}
              endpointList={endpoints.endpoints}
              locale={locale}
              dataVersion={endpoints.version}
              onLocaleLoadingChange={setIsLoadingCanvasLocale}
              onCopyMarkdownReady={handleCopyMarkdownReady}
            />
          )}
        </Container>
      </main>

      <footer>
        <Divider />
        <Container size="xl" py="sm">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              {endpoints.status === 'ready'
                ? t('footer.dataVersion', { version: endpoints.version })
                : t('footer.dataNotLoaded')}
            </Text>
            <Group gap="xs" align="center">
              <Text size="xs" c="dimmed">{t('footer.credit')}</Text>
              <a href="https://alltheducks.com" target="_blank" rel="noopener noreferrer" className={classes.inheritLink}>
                <AtdLogo height={24} aria-label="All the Ducks" />
              </a>
            </Group>
          </Group>
        </Container>
      </footer>
    </div>
  )
}

function App() {
  const [locale, setLocale] = useLocalePreference()

  return (
    <AppTranslationsProvider locale={locale}>
      <AppContent locale={locale} onLocaleChange={setLocale} />
    </AppTranslationsProvider>
  )
}

export default App
