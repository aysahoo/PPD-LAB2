import { useEffect, useState, type FormEvent } from 'react'
import { Button, Card, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'

import { PageHeading } from '@/components/PageHeading'
import { maxWField, PageShell } from '@/lib/layout'
import { api } from '@/lib/api'
import { adminCreateNotification } from '@/lib/notifications-api'
import * as storage from '@/lib/auth-storage'

type Dashboard = {
  studentCount: number
  courseCount: number
  enrollmentCounts: {
    pending: number
    approved: number
    rejected: number
    cancelled: number
  }
}

export function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notifyUserId, setNotifyUserId] = useState('')
  const [notifyBody, setNotifyBody] = useState('')
  const [notifyBusy, setNotifyBusy] = useState(false)
  const token = storage.getToken() ?? ''

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const d = await api.get<Dashboard>('/admin/dashboard', token)
        if (!cancelled) setData(d)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load dashboard')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  async function sendNotification(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const uid = Number.parseInt(notifyUserId, 10)
    if (!Number.isFinite(uid) || uid < 1) {
      notifications.show({ color: 'red', message: 'Enter a valid user ID' })
      return
    }
    if (!notifyBody.trim()) {
      notifications.show({ color: 'red', message: 'Enter a message' })
      return
    }
    setNotifyBusy(true)
    try {
      await adminCreateNotification(token, { userId: uid, body: notifyBody.trim() })
      notifications.show({ color: 'teal', message: 'Notification sent' })
      setNotifyBody('')
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof Error ? err.message : 'Failed to send',
      })
    } finally {
      setNotifyBusy(false)
    }
  }

  return (
    <PageShell>
      <PageHeading title="Dashboard" description="Overview of students, courses, and enrollments." />

      {error ? (
        <Text size="sm" c="red">
          {error}
        </Text>
      ) : null}

      {data === null ? (
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      ) : (
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <Card withBorder padding="md">
              <Text size="sm" c="dimmed" mb={4}>
                Students
              </Text>
              <Text fw={600} fz="xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {data.studentCount}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Active student accounts
              </Text>
            </Card>
            <Card withBorder padding="md">
              <Text size="sm" c="dimmed" mb={4}>
                Courses
              </Text>
              <Text fw={600} fz="xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {data.courseCount}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Catalog size
              </Text>
            </Card>
          </SimpleGrid>
          <Card withBorder padding="md">
            <Text fw={600} mb="sm">
              Enrollments by status
            </Text>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
              <Text size="sm">
                Pending:{' '}
                <Text component="span" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {data.enrollmentCounts.pending}
                </Text>
              </Text>
              <Text size="sm">
                Approved:{' '}
                <Text component="span" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {data.enrollmentCounts.approved}
                </Text>
              </Text>
              <Text size="sm">
                Rejected:{' '}
                <Text component="span" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {data.enrollmentCounts.rejected}
                </Text>
              </Text>
              <Text size="sm">
                Cancelled:{' '}
                <Text component="span" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {data.enrollmentCounts.cancelled}
                </Text>
              </Text>
            </SimpleGrid>
          </Card>

          <Card withBorder padding="lg" maw={maxWField}>
            <Text fw={600} mb={4}>
              Send notification
            </Text>
            <Text size="sm" c="dimmed" mb="md">
              Deliver an in-app message to a user by their numeric ID (students and admins).
            </Text>
            <form onSubmit={(e) => void sendNotification(e)}>
              <Stack gap="md">
                <TextInput
                  label="User ID"
                  id="notify-user-id"
                  type="number"
                  min={1}
                  step={1}
                  value={notifyUserId}
                  onChange={(e) => setNotifyUserId(e.target.value)}
                  placeholder="e.g. 1"
                />
                <Textarea
                  label="Message"
                  id="notify-body"
                  value={notifyBody}
                  onChange={(e) => setNotifyBody(e.target.value)}
                  rows={3}
                  placeholder="Short message shown in the notification center"
                />
                <Button type="submit" loading={notifyBusy}>
                  {notifyBusy ? 'Sending…' : 'Send'}
                </Button>
              </Stack>
            </form>
          </Card>
        </Stack>
      )}
    </PageShell>
  )
}
