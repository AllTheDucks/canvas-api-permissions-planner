import { useCallback, useMemo, useRef, useState } from 'react'
import { Center, Container, Grid, Group, Loader, Stack, Text, Title } from '@mantine/core'
import AtdLogo from './assets/atd-logo.svg?react'
import { useEndpoints } from './hooks/useEndpoints'
import { EndpointSelector } from './components/EndpointSelector'
import { SelectedEndpoints } from './components/SelectedEndpoints'
import { PermissionsResult } from './components/PermissionsResult'
import { aggregatePermissions } from './utils/permissionAggregator'
import type { Endpoint, PermissionRef } from './types'

type ReadyContentProps = {
  allPermissions: Record<string, PermissionRef>
  endpointList: Endpoint[]
  selectedEndpoints: Endpoint[]
  onToggle: (endpoint: Endpoint) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
}

function ReadyContent({ allPermissions, endpointList, selectedEndpoints, onToggle, searchInputRef }: ReadyContentProps) {
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
        {/* EndpointPaste will be wired here in Step 9 */}
        <SelectedEndpoints
          selected={selectedEndpoints}
          onRemove={onToggle}
          onLastRemoved={() => searchInputRef.current?.focus()}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 7 }}>
        <Title order={2} size="h4" mb="sm">Required Permissions</Title>
        <PermissionsResult permissions={aggregated} />
      </Grid.Col>
    </Grid>
  )
}

function App() {
  const endpoints = useEndpoints()
  const [selectedEndpoints, setSelectedEndpoints] = useState<Endpoint[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleToggleEndpoint = useCallback((endpoint: Endpoint) => {
    const id = `${endpoint.method} ${endpoint.path}`
    setSelectedEndpoints(prev =>
      prev.some(e => `${e.method} ${e.path}` === id)
        ? prev.filter(e => `${e.method} ${e.path}` !== id)
        : [...prev, endpoint]
    )
  }, [])

  return (
    <>
      <header>
        <Container size="xl" py="sm">
          <Group justify="space-between">
            <Group gap="sm">
              <a href="https://alltheducks.com" target="_blank" rel="noopener noreferrer">
                <AtdLogo height={32} aria-label="All the Ducks" />
              </a>
              <Title order={1} size="h3" visibleFrom="sm">Canvas API Permissions Planner</Title>
            </Group>
            <Group gap="xs">
              {/* Controls: LanguagePicker, ColorSchemeToggle, HelpModal — wired in later steps */}
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
              <a href="https://alltheducks.com" target="_blank" rel="noopener noreferrer">
                <AtdLogo height={24} aria-label="All the Ducks" />
              </a>
            </Group>
          </Group>
        </Container>
      </footer>
    </>
  )
}

export default App
