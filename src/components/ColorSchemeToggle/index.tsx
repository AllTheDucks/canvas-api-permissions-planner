import { ActionIcon, Tooltip, useMantineColorScheme } from '@mantine/core'
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react'
import { useAppTranslations } from '../../context/AppTranslationsContext'

const cycle = { light: 'dark', dark: 'auto', auto: 'light' } as const

const labelKeys = {
  dark: 'colorScheme.switchToDark',
  auto: 'colorScheme.switchToSystem',
  light: 'colorScheme.switchToLight',
} as const

const icons = { light: <IconSun size={18} />, dark: <IconMoon size={18} />, auto: <IconDeviceDesktop size={18} /> } as const

export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const { t } = useAppTranslations()

  const next = cycle[colorScheme]
  const label = t(labelKeys[next])

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
