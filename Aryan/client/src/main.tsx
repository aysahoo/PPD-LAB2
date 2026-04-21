import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'

import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

import { AuthProvider } from '@/contexts/auth-context'
import { clientBTheme } from '@/theme/mantine-theme'

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={clientBTheme} defaultColorScheme="light">
      <BrowserRouter>
        <AuthProvider>
          <Notifications position="top-right" zIndex={4000} />
          <App />
        </AuthProvider>
      </BrowserRouter>
    </MantineProvider>
  </StrictMode>,
)
