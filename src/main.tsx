import React, { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Center, Loader, MantineProvider, VisuallyHidden } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { theme } from './theme'

import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './styles/theme.css'
import './styles/print.css'

if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) =>
    import('react-dom').then((ReactDOM) =>
      axe.default(React, ReactDOM, 1000)
    )
  )
}

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
          <Suspense fallback={<main><VisuallyHidden><h1>Canvas API Permissions Planner</h1></VisuallyHidden><Center h="60vh" role="status" aria-label="Loading"><Loader /></Center></main>}>
            <App />
          </Suspense>
        </MantineProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
