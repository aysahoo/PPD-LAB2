import { AppShell, Box, Burger, Group, ScrollArea } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet } from 'react-router-dom'

import { SiteSidebar } from '@/components/SiteHeader'
import { SkipToContent } from '@/components/SkipToContent'
import { BrandLink } from '@/components/BrandLink'

export function PublicLayout() {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure()
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true)

  return (
    <AppShell
      header={{ height: 60, collapsed: desktopOpened }}
      navbar={{
        width: 280,
        breakpoint: 'md',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
      bg="gray.0"
    >
      <SkipToContent />

      {/* Mobile / Toggle Header */}
      <AppShell.Header style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <Group h="100%" px="md" align="center" wrap="nowrap">
          <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="md" size="sm" aria-label="Toggle navigation" />
          <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="md" size="sm" aria-label="Toggle navigation" />
          <Box hiddenFrom="md" style={{ minWidth: 0 }}>
            {!mobileOpened ? <BrandLink onNavigate={closeMobile} /> : null}
          </Box>
          <Box visibleFrom="md" style={{ minWidth: 0 }}>
            {!desktopOpened ? <BrandLink onNavigate={closeMobile} /> : null}
          </Box>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}>
        <AppShell.Section>
          <Group mb="xl" px="xs" justify="space-between">
             <BrandLink onNavigate={closeMobile} />
             <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="md" size="sm" aria-label="Toggle navigation" />
          </Group>
        </AppShell.Section>
        <AppShell.Section grow component={ScrollArea}>
          <SiteSidebar onNavigate={closeMobile} />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main
        id="main-content"
        tabIndex={-1}
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          background:
            'radial-gradient(1200px 400px at 50% -10%, var(--mantine-color-teal-light) 0%, transparent 55%), var(--mantine-color-gray-0)',
        }}
      >
        <Box style={{ flex: 1 }}>
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}
