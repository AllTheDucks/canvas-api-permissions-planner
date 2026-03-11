import { useCallback, useMemo, useRef, useState } from 'react'
import { Center, Container, Grid, Group, Loader, Stack, Text, Title } from '@mantine/core'
import AtdLogo from './assets/atd-logo.svg?react'
import { useEndpoints } from './hooks/useEndpoints'
import { EndpointSelector } from './components/EndpointSelector'
import { EndpointPaste } from './components/EndpointPaste'
import { SelectedEndpoints } from './components/SelectedEndpoints'
import { PermissionsResult } from './components/PermissionsResult'
import { ColorSchemeToggle } from './components/ColorSchemeToggle'
import { AppTranslationsProvider } from './context/AppTranslationsContext'
import { aggregatePermissions } from './utils/permissionAggregator'
import { detectLocale } from './utils/detectLocale'
import { SUPPORTED_LOCALES, isSupportedLocale } from './i18n/locales'
import type { Endpoint, PermissionRef } from './types'

type ReadyContentProps = {
  allPermissions: Record<string, PermissionRef>
  endpointList: Endpoint[]
  selectedEndpoints: Endpoint[]
  onToggle: (endpoint: Endpoint) => void
  onAddMany: (endpoints: Endpoint[]) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
}

function ReadyContent({ allPermissions, endpointList, selectedEndpoints, onToggle, onAddMany, searchInputRef }: ReadyContentProps) {
  const aggregated = useMemo(
    () => aggregatePermissions(selectedEndpoints, allPermissions, {}),
    [selectedEndpoints, allPermissions],
  )

  return (
    <Grid>
      <Grid.Col span={{ base: 12, sm: 5 }}>
        <Title order={2} size="h4" mb="sm">Add Endpoints</Title>
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
      <Grid.Col span={{ base: 12, sm: 7 }}>
        <Title order={2} size="h4" mb="sm">Required Permissions</Title>
        <PermissionsResult permissions={aggregated} selectedCount={selectedEndpoints.length} />
      </Grid.Col>
    </Grid>
  )
}

function App() {
  const endpoints = useEndpoints()
  const [selectedEndpoints, setSelectedEndpoints] = useState<Endpoint[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

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

  // handleLocaleChange will be passed to LanguagePicker in Step 14
  void handleLocaleChange

  return (
    <AppTranslationsProvider locale={locale}>
      <header>
        <Container size="xl" py="sm">
          <Group justify="space-between">
            <Group gap="sm">
              <a href="https://alltheducks.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                <AtdLogo height={32} aria-label="All the Ducks" />
              </a>
              <Title order={1} size="h3" visibleFrom="sm">Canvas API Permissions Planner</Title>
            </Group>
            <Group gap="xs">
              {/* LanguagePicker — wired in Step 14 */}
              <ColorSchemeToggle />
              {/* HelpModal — wired in Step 17 */}
            </Group>
          </Group>
        </Container>
      </header>

      <main aria-label="Canvas API Permissions Planner">
        <Container size="xl" py="md">
          {endpoints.status === 'loading' && (
            <Center h="60vh"><Loader /></Center>
          )}

          {endpoints.status === 'error' && (
            <Center h="60vh">
              <Stack align="center">
                <Text c="red" fw={500}>Failed to load permission data</Text>
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
            />
          )}
        </Container>
      </main>

      <footer>
        <Container size="xl" py="sm">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              {endpoints.status === 'ready'
                ? `Canvas data: ${endpoints.version}`
                : 'Canvas data: (not loaded)'}
            </Text>
            <Group gap="xs" align="center">
              <Text size="xs" c="dimmed">A free tool by</Text>
              <a href="https://alltheducks.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                <AtdLogo height={24} aria-label="All the Ducks" />
              </a>
            </Group>
          </Group>
        </Container>
      </footer>
    </AppTranslationsProvider>
  )
}

export default App
