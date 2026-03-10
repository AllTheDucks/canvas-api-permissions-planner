import { Container, Group, Text, Title } from '@mantine/core'
import AtdLogo from './assets/atd-logo.svg?react'

function App() {
  return (
    <>
      <header>
        <Container size="xl" py="sm">
          <Group justify="space-between">
            <Group gap="sm">
              <a href="https://alltheducks.com" target="_blank" rel="noopener noreferrer">
                <AtdLogo height={32} aria-label="All the Ducks" />
              </a>
              <Title order={2}>Canvas API Permissions Planner</Title>
            </Group>
            <Group gap="xs">
              {/* Controls: LanguagePicker, ColorSchemeToggle, HelpModal — wired in later steps */}
            </Group>
          </Group>
        </Container>
      </header>

      <main>
        <Container size="xl" py="md">
          <Text c="dimmed">Select endpoints to see required permissions.</Text>
        </Container>
      </main>

      <footer>
        <Container size="xl" py="sm">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Canvas data: (not loaded)
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
