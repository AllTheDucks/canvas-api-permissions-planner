import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Center, Container, Grid, Group, Loader, Stack, Text, Title } from '@mantine/core'
import AtdLogo from './assets/atd-logo.svg?react'
import { useEndpoints } from './hooks/useEndpoints'
import { useLocale } from './hooks/useLocale'
import { EndpointSelector } from './components/EndpointSelector'
import { EndpointPaste } from './components/EndpointPaste'
import { SelectedEndpoints } from './components/SelectedEndpoints'
import { PermissionsResult } from './components/PermissionsResult'
import { ColorSchemeToggle } from './components/ColorSchemeToggle'
import { LanguagePicker } from './components/LanguagePicker'
import { HelpModal } from './components/HelpModal'
import { AppTranslationsProvider, useAppTranslations } from './context/AppTranslationsContext'
import { aggregatePermissions } from './utils/permissionAggregator'
import { detectLocale } from './utils/detectLocale'
import { loadSupplementalFont } from './utils/supplementalFont'
import { SUPPORTED_LOCALES, isSupportedLocale } from './i18n/locales'
import type { Endpoint, PermissionRef } from './types'

type ReadyContentProps = {
  allPermissions: Record<string, PermissionRef>
  endpointList: Endpoint[]
  selectedEndpoints: Endpoint[]
  onToggle: (endpoint: Endpoint) => void
  onAddMany: (endpoints: Endpoint[]) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
  locale: string
  dataVersion: string
}

function ReadyContent({ allPermissions, endpointList, selectedEndpoints, onToggle, onAddMany, searchInputRef, locale, dataVersion }: ReadyContentProps) {
  const { t } = useAppTranslations()
  const { localeLabels, isLoading: localeLoading } = useLocale(locale, allPermissions, dataVersion)

  const aggregated = useMemo(
    () => aggregatePermissions(selectedEndpoints, allPermissions, localeLabels),
    [selectedEndpoints, allPermissions, localeLabels],
  )

  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 5 }} data-print-hide>
        <Title order={2} size="h4" mb="sm">{t('endpoints.heading')}</Title>
        <EndpointSelector
          endpoints={endpointList}
          selected={selectedEndpoints}
          onToggle={onToggle}
          inputRef={searchInputRef}
        />
        <EndpointPaste endpoints={endpointList} onAdd={onAddMany} />
        <SelectedEndpoints
          selected={selectedEndpoints}
          onRemove={onToggle}
          onLastRemoved={() => searchInputRef.current?.focus()}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 7 }} data-print-permissions>
        <div data-print-only>
          <Text fw={700} size="lg" mb={2}>{t('app.title')}</Text>
          <Text data-print-date size="xs" c="dimmed" mb="md">{new Date().toLocaleDateString()}</Text>
          {selectedEndpoints.length > 0 && (
            <Stack gap={0} mb="md">
              {selectedEndpoints.map(e => (
                <Text key={`${e.method} ${e.path}`} size="sm" c="dimmed">
                  {e.method} {e.path}
                </Text>
              ))}
            </Stack>
          )}
        </div>
        <Title order={2} size="h4" mb="sm">{t('permissions.heading')}</Title>
        <PermissionsResult permissions={aggregated} selectedCount={selectedEndpoints.length} isLoadingLocale={localeLoading} />
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
  const [selectedEndpoints, setSelectedEndpoints] = useState<Endpoint[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { t, isRtl } = useAppTranslations()

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

  const handleToggleEndpoint = useCallback((endpoint: Endpoint) => {
    const id = `${endpoint.method} ${endpoint.path}`
    setSelectedEndpoints(prev =>
      prev.some(e => `${e.method} ${e.path}` === id)
        ? prev.filter(e => `${e.method} ${e.path}` !== id)
        : [...prev, endpoint]
    )
  }, [])

  const handleAddMany = useCallback((newEndpoints: Endpoint[]) => {
    setSelectedEndpoints(prev => {
      const existing = new Set(prev.map(e => `${e.method} ${e.path}`))
      const toAdd = newEndpoints.filter(e => !existing.has(`${e.method} ${e.path}`))
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev
    })
  }, [])

  return (
    <>
      <header>
        <Container size="xl" py="sm">
          <Group justify="space-between">
            <Group gap="sm">
              <a href="https://alltheducks.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                <AtdLogo height={32} aria-label="All the Ducks" />
              </a>
              <Title order={1} size="h3" visibleFrom="sm">{t('app.title')}</Title>
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
      </header>

      <main aria-label={t('app.title')}>
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
              selectedEndpoints={selectedEndpoints}
              onToggle={handleToggleEndpoint}
              onAddMany={handleAddMany}
              searchInputRef={searchInputRef}
              locale={locale}
              dataVersion={endpoints.version}
            />
          )}
        </Container>
      </main>

      <footer>
        <Container size="xl" py="sm">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              {endpoints.status === 'ready'
                ? t('footer.dataVersion', { version: endpoints.version })
                : t('footer.dataNotLoaded')}
            </Text>
            <Group gap="xs" align="center">
              <Text size="xs" c="dimmed">{t('footer.credit')}</Text>
              <a href="https://alltheducks.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                <AtdLogo height={24} aria-label="All the Ducks" />
              </a>
            </Group>
          </Group>
        </Container>
      </footer>
    </>
  )
}

function App() {
  const [locale, setLocale] = useState(() => {
    const stored = localStorage.getItem('locale')
    if (stored && isSupportedLocale(stored)) return stored
    if (stored) localStorage.removeItem('locale')
    return detectLocale(SUPPORTED_LOCALES)
  })

  const handleLocaleChange = useCallback((newLocale: string) => {
    if (newLocale === detectLocale(SUPPORTED_LOCALES)) {
      localStorage.removeItem('locale')
    } else {
      localStorage.setItem('locale', newLocale)
    }
    setLocale(newLocale)
  }, [])

  return (
    <AppTranslationsProvider locale={locale}>
      <AppContent locale={locale} onLocaleChange={handleLocaleChange} />
    </AppTranslationsProvider>
  )
}

export default App
