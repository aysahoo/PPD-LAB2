import { useCallback, useEffect, useState } from 'react'
import { Anchor, Badge, Button, Card, Group, Table, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Link } from 'react-router-dom'

import { PageHeading } from '@/components/PageHeading'
import { PageShell } from '@/lib/layout'
import { api } from '@/lib/api'
import * as storage from '@/lib/auth-storage'
import type { Enrollment } from '@/types/enrollment'

function AdminEnrollmentsContent() {
  const [rows, setRows] = useState<Enrollment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const token = storage.getToken() ?? ''

  const refresh = useCallback(async () => {
    const list = await api.get<Enrollment[]>('/enrollments', token)
    setRows(list)
  }, [token])

  useEffect(() => {
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
  }, [refresh])

  async function approve(id: number) {
    setError(null)
    setBusyId(id)
    try {
      await api.putJson<Enrollment>(`/enrollments/${id}/approve`, {}, token)
      notifications.show({ color: 'teal', message: 'Enrollment approved' })
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Approve failed'
      setError(msg)
      notifications.show({ color: 'red', message: msg })
    } finally {
      setBusyId(null)
    }
  }

  async function reject(id: number) {
    setError(null)
    setBusyId(id)
    try {
      await api.putJson<Enrollment>(`/enrollments/${id}/reject`, {}, token)
      notifications.show({ color: 'teal', message: 'Enrollment rejected' })
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Reject failed'
      setError(msg)
      notifications.show({ color: 'red', message: msg })
    } finally {
      setBusyId(null)
    }
  }

  const pending = rows?.filter((e) => e.status === 'PENDING') ?? []

  return (
    <PageShell>
      <PageHeading
        title="Enrollments"
        description="Approve or reject pending requests. Capacity is enforced on approve."
      />

      {error ? (
        <Text size="sm" c="red">
          {error}
        </Text>
      ) : null}

      <Card withBorder padding="lg">
        <Text fw={600} mb={4}>
          Pending queue
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          {pending.length === 0 && rows !== null
            ? 'No pending enrollments.'
            : 'Students waiting for approval'}
        </Text>
        {rows === null ? (
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        ) : pending.length === 0 ? (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={480}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Student</Table.Th>
                  <Table.Th>Course</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pending.map((e) => (
                  <Table.Tr key={e.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {e.student.email}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {e.student.name ?? '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Anchor component={Link} to={`/courses/${e.courseId}`} size="sm">
                        {e.course.code} — {e.course.title}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" wrap="wrap">
                        <Button type="button" size="xs" loading={busyId === e.id} onClick={() => void approve(e.id)}>
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          color="red"
                          loading={busyId === e.id}
                          onClick={() => void reject(e.id)}
                        >
                          Reject
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      <Card withBorder padding="lg">
        <Text fw={600} mb={4}>
          All enrollments
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          Full list with status
        </Text>
        {rows === null ? null : rows.length === 0 ? (
          <Text size="sm" c="dimmed">
            None yet.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={400}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Student</Table.Th>
                  <Table.Th>Course</Table.Th>
                  <Table.Th>Status</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((e) => (
                  <Table.Tr key={e.id}>
                    <Table.Td fz="sm">{e.student.email}</Table.Td>
                    <Table.Td fz="sm">
                      {e.course.code} — {e.course.title}
                    </Table.Td>
                    <Table.Td>
                      <Badge color="gray" variant="light">
                        {e.status}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </PageShell>
  )
}

export function AdminEnrollmentsPage() {
  return <AdminEnrollmentsContent />
}
