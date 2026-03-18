import { useCallback, useDeferredValue, useMemo, useRef } from 'react'
import { ActionIcon, Center, Container, Divider, Grid, Group, Loader, Paper, Stack, Text, Title, Tooltip, VisuallyHidden } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconLink } from '@tabler/icons-react'
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
import type { Endpoint, PermissionRef } from './types'
import classes from './App.module.css'

type ReadyContentProps = {
  allPermissions: Record<string, PermissionRef>
  endpointList: Endpoint[]
  locale: string
  dataVersion: string
}

function ReadyContent({ allPermissions, endpointList, locale, dataVersion }: ReadyContentProps) {
  const { t } = useAppTranslations()
  const { localeLabels, isLoading: localeLoading } = useLocale(locale, allPermissions, dataVersion)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { selectedEndpoints, handleToggle, handleAddMany, handleBulkToggle } = useUrlSelection(endpointList, dataVersion)
  const deferredSelected = useDeferredValue(selectedEndpoints)

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      notifications.show({
        message: t('share.copied'),
        autoClose: 3000,
      })
    })
  }, [t])

  const aggregated = useMemo(
    () => aggregatePermissions(deferredSelected, allPermissions, localeLabels),
    [deferredSelected, allPermissions, localeLabels],
  )

  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 5 }} data-print-hide>
        <Stack gap="md">
          <Paper shadow="xs" radius="md" p="md" withBorder>
            <Title order={2} size="h4" mb="sm">{t('endpoints.heading')}</Title>
            <EndpointSelector
              endpoints={endpointList}
              selected={selectedEndpoints}
              onToggle={handleToggle}
              onBulkToggle={handleBulkToggle}
              inputRef={searchInputRef}
            />
          </Paper>
          <Paper shadow="xs" radius="md" p="md" withBorder>
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
        <div data-print-only>
          <Text fw={700} size="lg" mb={2}>{t('app.title')}</Text>
          <Text data-print-date size="xs" c="dimmed" mb="md">{new Date().toLocaleDateString()}</Text>
          {deferredSelected.length > 0 && (
            <Stack gap={0} mb="md">
              {deferredSelected.map(e => (
                <Text key={`${e.method} ${e.path}`} size="sm" c="dimmed">
                  {e.method} {e.path}
                </Text>
              ))}
            </Stack>
          )}
        </div>
        <Paper shadow="xs" radius="md" p="md" withBorder>
          <Group justify="space-between" mb="sm">
            <Title order={2} size="h4">{t('permissions.heading')}</Title>
            {deferredSelected.length > 0 && (
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
            )}
          </Group>
          <PermissionsResult permissions={aggregated} selectedCount={deferredSelected.length} isLoadingLocale={localeLoading} />
        </Paper>
      </Grid.Col>
    </Grid>
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
  const { t, isRtl } = useAppTranslations()
  useLocaleSync(locale, isRtl)

  return (
    <div className={classes.appLayout}>
      <header>
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
              <LanguagePicker value={locale} onChange={onLocaleChange} />
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
