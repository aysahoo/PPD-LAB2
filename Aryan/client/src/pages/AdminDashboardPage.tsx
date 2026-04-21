import { useEffect, useState, type FormEvent } from 'react'
import { Button, Card, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Download } from 'lucide-react'

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
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyBody, setNotifyBody] = useState('')
  const [notifyBusy, setNotifyBusy] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)
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
    const email = notifyEmail.trim()
    if (!email) {
      notifications.show({ color: 'red', message: 'Enter an email address' })
      return
    }
    if (!notifyBody.trim()) {
      notifications.show({ color: 'red', message: 'Enter a message' })
      return
    }
    setNotifyBusy(true)
    try {
      await adminCreateNotification(token, { email, body: notifyBody.trim() })
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

  async function downloadReport() {
    if (!token) {
      notifications.show({ color: 'red', message: 'Sign in again to download' })
      return
    }
    setReportBusy(true)
    try {
      const blob = await api.getBlob('/admin/reports/download.xlsx', token)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `admin-report-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      notifications.show({ color: 'teal', message: 'Report downloaded' })
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof Error ? err.message : 'Download failed',
      })
    } finally {
      setReportBusy(false)
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

          <Card withBorder padding="lg">
            <Text fw={600} mb={4}>
              Download report
            </Text>
            <Text size="sm" c="dimmed" mb="md">
              Excel workbook with three sheets: all courses (including prerequisites), all student
              accounts, and every enrollment with student and course details.
            </Text>
            <Button
              type="button"
              variant="light"
              leftSection={<Download size={16} aria-hidden />}
              loading={reportBusy}
              onClick={() => void downloadReport()}
            >
              {reportBusy ? 'Preparing…' : 'Download Excel report'}
            </Button>
          </Card>

          <Card withBorder padding="lg" maw={maxWField}>
            <Text fw={600} mb={4}>
              Send notification
            </Text>
            <Text size="sm" c="dimmed" mb="md">
              Deliver an in-app message to a user by their email address (students and admins).
            </Text>
            <form onSubmit={(e) => void sendNotification(e)}>
              <Stack gap="md">
                <TextInput
                  label="Email address"
                  id="notify-email"
                  type="email"
                  autoComplete="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="name@example.com"
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
