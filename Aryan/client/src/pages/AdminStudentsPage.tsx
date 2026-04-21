import { useEffect, useState } from 'react'
import { Anchor, Badge, Card, Table, Text } from '@mantine/core'
import { Link } from 'react-router-dom'

import { PageHeading } from '@/components/PageHeading'
import { PageShell } from '@/lib/layout'
import { api } from '@/lib/api'
import * as storage from '@/lib/auth-storage'
import type { AdminStudentRecord } from '@/types/student'

export function AdminStudentsPage() {
  const [rows, setRows] = useState<AdminStudentRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const token = storage.getToken() ?? ''

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await api.get<AdminStudentRecord[]>('/admin/students', token)
        if (!cancelled) setRows(list)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load students')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <PageShell>
      <PageHeading title="Students" description="All student accounts." />

      {error ? (
        <Text size="sm" c="red">
          {error}
        </Text>
      ) : null}

      <Card withBorder padding="lg">
        <Text fw={600} mb="md">
          Directory
        </Text>
        {rows === null ? (
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        ) : rows.length === 0 ? (
          <Text size="sm" c="dimmed">
            No students yet.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={500}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Phone</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th style={{ width: 96 }}>Details</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((r) => (
                  <Table.Tr key={r.id}>
                    <Table.Td fw={500}>
                      <Anchor component={Link} to={`/admin/students/${r.id}`} size="sm">
                        {r.email}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>{r.name ?? '—'}</Table.Td>
                    <Table.Td>{r.phone ?? '—'}</Table.Td>
                    <Table.Td>
                      <Badge color={r.isActive ? 'teal' : 'gray'} variant="light">
                        {r.isActive ? 'active' : 'inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Anchor component={Link} to={`/admin/students/${r.id}`} size="sm">
                        View
                      </Anchor>
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
