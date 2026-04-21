import { Button, Group, Stack, Text, Title } from '@mantine/core'
import { useNavigate } from 'react-router-dom'

import { PageShell } from '@/lib/layout'
import { useAuth } from '@/contexts/auth-context'

/** Minimal landing: left-aligned column — layout + copy differ from default `client` (centered hero + 3 cards). */
export function HomePage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  return (
    <PageShell>
      <Stack gap="md" align="flex-start" maw={520}>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.14em' }}>
          PPD Lab
        </Text>
        <Title order={1} fz={{ base: '1.75rem', sm: '2rem' }} fw={600} style={{ letterSpacing: '-0.02em' }}>
          Courses and enrollment requests
        </Title>
        <Text size="md" c="dimmed" lh={1.6}>
          Browse the catalog without signing in. When you are ready, log in to request a seat and check status on your
          enrollments.
        </Text>
        <Group gap="sm" wrap="wrap" mt="xs">
          <Button onClick={() => navigate('/courses')}>View catalog</Button>
          {!loading && !user ? (
            <Button variant="default" onClick={() => navigate('/register')}>
              Register
            </Button>
          ) : null}
          {!loading && user?.role === 'student' ? (
            <Button variant="default" onClick={() => navigate('/enrollments')}>
              My enrollments
            </Button>
          ) : null}
          {!loading && user?.role === 'admin' ? (
            <Button variant="default" onClick={() => navigate('/admin/dashboard')}>
              Admin
            </Button>
          ) : null}
        </Group>
      </Stack>
    </PageShell>
  )
}
