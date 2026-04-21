import { Box, Group, Stack, Text, Divider, ThemeIcon } from '@mantine/core'
import { UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { NotificationMenu } from '@/components/NotificationMenu'
import { useAuth } from '@/contexts/auth-context'

function NavItem({
  to,
  end,
  onNavigate,
  children,
}: {
  to: string
  end?: boolean
  onNavigate?: () => void
  children: React.ReactNode
}) {
  return (
    <NavLink to={to} end={end} onClick={onNavigate} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <Group
          wrap="nowrap"
          px="md"
          py="sm"
          style={{
            borderRadius: 'var(--mantine-radius-md)',
            background: isActive ? 'var(--mantine-color-teal-light)' : 'transparent',
            transition: 'background-color 150ms ease',
          }}
        >
          <Text
            size="sm"
            fw={isActive ? 600 : 500}
            c={isActive ? 'teal.7' : 'dimmed'}
          >
            {children}
          </Text>
        </Group>
      )}
    </NavLink>
  )
}

function PrimaryNav({
  onNavigate,
  showAccountLink,
  renderAuthLinks = false,
}: {
  onNavigate?: () => void
  showAccountLink?: boolean
  renderAuthLinks?: boolean
}) {
  const { user, loading } = useAuth()

  return (
    <Stack gap={4} component="nav" aria-label="Primary">
      <NavItem to="/" end onNavigate={onNavigate}>
        Home
      </NavItem>
      <NavItem to="/courses" onNavigate={onNavigate}>
        Courses
      </NavItem>
      {!loading && user?.role === 'student' ? (
        <NavItem to="/enrollments" onNavigate={onNavigate}>
          My enrollments
        </NavItem>
      ) : null}
      {!loading && user && showAccountLink ? (
        <NavItem to="/account" onNavigate={onNavigate}>
          Account
        </NavItem>
      ) : null}
      {!loading && user?.role === 'admin' ? (
        <NavItem to="/admin/dashboard" onNavigate={onNavigate}>
          Admin
        </NavItem>
      ) : null}
      {renderAuthLinks && !loading && !user ? (
        <>
          <Divider my="sm" />
          <Text size="xs" tt="uppercase" c="dimmed" px="xs" mb={4} fw={600}>
            Account
          </Text>
          <NavItem to="/login" onNavigate={onNavigate}>
            Sign in
          </NavItem>
          <NavItem to="/register" onNavigate={onNavigate}>
            Register
          </NavItem>
        </>
      ) : null}
    </Stack>
  )
}

export function SiteSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth()

  return (
    <Box>
      <PrimaryNav onNavigate={onNavigate} renderAuthLinks={true} />
      
      {user && (
        <>
          <Divider my="lg" />
          <Stack gap="sm">
             <Group justify="space-between" align="center" wrap="nowrap" gap="xs" px="xs">
                <Text size="xs" c="dimmed" style={{ flex: 1, minWidth: 0 }}>
                  Alerts
                </Text>
                <NotificationMenu />
            </Group>
            <NavItem to="/account" onNavigate={onNavigate}>
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon variant="light" color="teal" size="sm" radius="xl">
                  <UserRound size={16} />
                </ThemeIcon>
                <Text size="sm">My Profile</Text>
              </Group>
            </NavItem>
          </Stack>
        </>
      )}
    </Box>
  )
}
