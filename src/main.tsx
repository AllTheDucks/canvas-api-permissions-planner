import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { theme } from './theme'
import App from './App'

import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './styles/print.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <MantineProvider theme={theme} defaultColorScheme="auto">
        <Notifications />
        <App />
      </MantineProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
