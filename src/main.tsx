import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Center, Loader, MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { theme } from './theme'

import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './styles/print.css'

const App = lazy(() => import('./App'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme} defaultColorScheme="auto">
          <Notifications />
          <Suspense fallback={<Center h="60vh"><Loader /></Center>}>
            <App />
          </Suspense>
        </MantineProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
