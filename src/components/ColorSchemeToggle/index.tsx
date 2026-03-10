import { ActionIcon, Tooltip, useMantineColorScheme } from '@mantine/core'
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react'

const cycle = { light: 'dark', dark: 'auto', auto: 'light' } as const

const labels = { dark: 'Switch to dark mode', auto: 'Switch to system mode', light: 'Switch to light mode' } as const

const icons = { light: <IconSun size={18} />, dark: <IconMoon size={18} />, auto: <IconDeviceDesktop size={18} /> } as const

export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  const next = cycle[colorScheme]
  const label = labels[next]

  return (
    <Tooltip label={label}>
      <ActionIcon
        onClick={() => setColorScheme(next)}
        variant="default"
        aria-label={label}
      >
        {icons[colorScheme]}
      </ActionIcon>
    </Tooltip>
  )
}
