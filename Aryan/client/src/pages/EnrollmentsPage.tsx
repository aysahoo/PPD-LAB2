import { useCallback, useEffect, useState } from 'react'
import { Anchor, Badge, Button, Card, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeading } from '@/components/PageHeading'
import { breadcrumbPresets } from '@/lib/breadcrumb-presets'
import { PageLoadingCenter, PageShell, PageShellNarrow } from '@/lib/layout'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import * as storage from '@/lib/auth-storage'
import type { Enrollment } from '@/types/enrollment'

function statusColor(s: Enrollment['status']) {
  switch (s) {
    case 'APPROVED':
      return 'green'
    case 'PENDING':
      return 'yellow'
    case 'REJECTED':
      return 'red'
    default:
      return 'gray'
  }
}

function EnrollmentsContent() {
  const { user, loading } = useAuth()
  const [rows, setRows] = useState<Enrollment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const token = storage.getToken() ?? ''

  const refresh = useCallback(async () => {
    if (!token || user?.role !== 'student') return
    const list = await api.get<Enrollment[]>('/enrollments/mine', token)
    setRows(list)
  }, [token, user?.role])

  useEffect(() => {
    if (loading || !user || user.role !== 'student') return
    let cancelled = false
    void (async () => {
      try {
        await refresh()
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load enrollments')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loading, user, refresh])

  useEffect(() => {
    if (loading || !user || user.role !== 'student') return
    const POLL_MS = 15_000
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void refresh().catch(() => {
        /* keep polling */
      })
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [loading, user, refresh])

  async function handleCancel(enrollmentId: number) {
    if (!window.confirm('Cancel this enrollment?')) return
    setError(null)
    try {
      await api.delete(`/enrollments/${enrollmentId}`, token)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel')
    }
  }

  if (loading) {
    return (
      <PageLoadingCenter>
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      </PageLoadingCenter>
    )
  }

  if (!user) {
    return null
  }

  if (user.role === 'admin') {
    return (
      <PageShellNarrow>
        <Breadcrumbs items={breadcrumbPresets.enrollments} />
        <Card withBorder padding="lg">
          <Text fw={600} mb="xs">
            Student enrollments
          </Text>
          <Text size="sm" c="dimmed">
            Your account is an administrator. Use{' '}
            <Anchor component={Link} to="/admin/enrollments" size="sm">
              Admin — Enrollments
            </Anchor>{' '}
            to approve or reject requests.
          </Text>
        </Card>
      </PageShellNarrow>
    )
  }

  return (
    <PageShell>
      <Stack gap="md">
        <Breadcrumbs items={breadcrumbPresets.enrollments} />
        <PageHeading
          title="My enrollments"
          description="Status for each course you requested. You can cancel pending or approved requests here."
        />
      </Stack>

      {error ? (
        <Text size="sm" c="red" role="alert">
          {error}
        </Text>
      ) : null}

      {rows === null ? (
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      ) : rows.length === 0 ? (
        <Text size="sm" c="dimmed">
          No enrollments yet.{' '}
          <Anchor component={Link} to="/courses" size="sm">
            Browse courses
          </Anchor>
          .
        </Text>
      ) : (
        <Stack component="ul" gap="md" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map((e) => (
            <Card key={e.id} component="li" withBorder padding="md">
              <Stack gap="sm">
                <Stack gap={4} align="flex-start" justify="space-between" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  <Anchor component={Link} to={`/courses/${e.courseId}`} fw={600}>
                    {e.course.code} — {e.course.title}
                  </Anchor>
                  <Badge color={statusColor(e.status)}>{e.status}</Badge>
                </Stack>
                <Text size="sm" c="dimmed">
                  Requested {new Date(e.createdAt).toLocaleString()}
                </Text>
                {(e.status === 'PENDING' || e.status === 'APPROVED') && (
                  <Button type="button" variant="default" size="xs" onClick={() => void handleCancel(e.id)}>
                    Cancel enrollment
                  </Button>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </PageShell>
  )
}

export function EnrollmentsPage() {
  return <EnrollmentsContent />
}
