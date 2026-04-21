import {
  ActionIcon,
  AppShell,
  Box,
  Burger,
  Divider,
  Group,
  NavLink as MantineNavLink,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  Home,
  LayoutDashboard,
  ScrollText,
  Shield,
} from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { BrandLink } from '@/components/BrandLink'
import { NotificationMenu } from '@/components/NotificationMenu'
import { SkipToContent } from '@/components/SkipToContent'

const adminNav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/students', label: 'Students', icon: GraduationCap },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/enrollments', label: 'Enrollments', icon: ScrollText },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/admins', label: 'Admins', icon: Shield },
] as const

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()

  return (
    <Stack gap={4} component="nav" aria-label="Admin">
      {adminNav.map(({ to, label, icon: Icon }) => {
        const active =
          location.pathname === to || (to === '/admin/dashboard' && location.pathname === '/admin')
        return (
          <MantineNavLink
            key={to}
            component={Link}
            to={to}
            label={label}
            leftSection={<Icon size={18} strokeWidth={1.75} aria-hidden />}
            active={active}
            onClick={onNavigate}
            variant="light"
            color="teal"
            styles={{
              root: {
                borderRadius: 'var(--mantine-radius-md)',
              },
            }}
          />
        )
      })}
    </Stack>
  )
}

export function AdminLayout() {
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
        <Group h="100%" px="md" justify="space-between">
          <Group align="center" wrap="nowrap">
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="md" size="sm" aria-label="Toggle navigation" />
            <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="md" size="sm" aria-label="Toggle navigation" />
            <Group gap="xs" align="center" wrap="nowrap" hiddenFrom="md" style={{ minWidth: 0 }}>
              {!mobileOpened ? (
                <>
                  <BrandLink onNavigate={closeMobile} />
                  <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.12em' }}>
                    Admin
                  </Text>
                </>
              ) : null}
            </Group>
            <Group gap="xs" align="center" wrap="nowrap" visibleFrom="md" style={{ minWidth: 0 }}>
              {!desktopOpened ? (
                <>
                  <BrandLink onNavigate={closeMobile} />
                  <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: '0.12em' }}>
                    Admin
                  </Text>
                </>
              ) : null}
            </Group>
          </Group>
          <Group gap="xs" wrap="nowrap" hiddenFrom="md">
            <NotificationMenu />
            <ActionIcon component={Link} to="/" onClick={closeMobile} variant="subtle" size="lg" aria-label="Back to site">
              <Home size={18} aria-hidden />
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ borderRight: '1px solid var(--mantine-color-default-border)' }}>
        <AppShell.Section>
          <Group mb="xl" px="xs" justify="space-between">
            <Box>
               <BrandLink onNavigate={closeMobile} />
               <Text size="xs" c="dimmed" mt={6} tt="uppercase" style={{ letterSpacing: '0.12em' }}>
                  Control center
                </Text>
            </Box>
            <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="md" size="sm" aria-label="Toggle navigation" />
          </Group>
        </AppShell.Section>
        <AppShell.Section grow component={ScrollArea}>
          <SidebarNav onNavigate={closeMobile} />
        </AppShell.Section>
        <AppShell.Section>
           <Stack gap="sm" pt="md">
              <Divider />
              <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                <Text size="xs" c="dimmed" style={{ flex: 1, minWidth: 0 }}>
                  Alerts
                </Text>
                <NotificationMenu />
              </Group>
              <MantineNavLink
                component={Link}
                to="/"
                label="Back to site"
                leftSection={<ThemeIcon variant="light" color="teal" size="sm" radius="md" aria-hidden><Home size={16} /></ThemeIcon>}
                variant="subtle"
                onClick={closeMobile}
              />
            </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main
        id="main-content"
        tabIndex={-1}
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          background: 'var(--mantine-color-gray-0)',
        }}
      >
        <Box style={{ flex: 1 }}>
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  )
}
