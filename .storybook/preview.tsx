import type { ReactNode } from 'react'
import type { Preview } from '@storybook/react-vite'
import { MantineProvider, useMantineColorScheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { useEffect } from 'react'
import { theme } from '../src/theme'
import { AppTranslationsProvider } from '../src/context/AppTranslationsContext'

import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

function ColorSchemeWrapper({ colorScheme, children }: { colorScheme: string; children: ReactNode }) {
  const { setColorScheme } = useMantineColorScheme()
  useEffect(() => {
    setColorScheme(colorScheme as 'light' | 'dark' | 'auto')
  }, [colorScheme, setColorScheme])
  return <>{children}</>
}

const preview: Preview = {
  globalTypes: {
    colorScheme: {
      name: 'Color scheme',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
          { value: 'auto', title: 'Auto' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    colorScheme: 'light',
  },
  decorators: [
    (Story, context) => (
      <MantineProvider theme={theme} defaultColorScheme="light" forceColorScheme={context.globals.colorScheme === 'auto' ? undefined : context.globals.colorScheme}>
        <Notifications />
        <AppTranslationsProvider locale="en">
          <ColorSchemeWrapper colorScheme={context.globals.colorScheme}>
            <Story />
          </ColorSchemeWrapper>
        </AppTranslationsProvider>
      </MantineProvider>
    ),
  ],
}

export default preview
