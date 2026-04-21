import { useEffect, useState } from 'react'
import { Card, Stack, Table, Text } from '@mantine/core'

import { PageHeading } from '@/components/PageHeading'
import { PageShell } from '@/lib/layout'
import { api } from '@/lib/api'
import * as storage from '@/lib/auth-storage'

type ReportRow = { key: string; value: number }

export function AdminReportsPage() {
  const [enrollments, setEnrollments] = useState<ReportRow[] | null>(null)
  const [students, setStudents] = useState<ReportRow[] | null>(null)
  const [courses, setCourses] = useState<ReportRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const token = storage.getToken() ?? ''

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [e, s, c] = await Promise.all([
          api.get<ReportRow[]>('/admin/reports/enrollments', token),
          api.get<ReportRow[]>('/admin/reports/students', token),
          api.get<ReportRow[]>('/admin/reports/courses', token),
        ])
        if (!cancelled) {
          setEnrollments(e)
          setStudents(s)
          setCourses(c)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load reports')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <PageShell>
      <PageHeading title="Reports" description="Aggregated metrics from the API." />

      {error ? (
        <Text size="sm" c="red">
          {error}
        </Text>
      ) : null}

      <Stack gap="md">
        <Card withBorder padding="lg">
          <Text fw={600} mb={4}>
            Enrollments
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Counts by status
          </Text>
          {enrollments === null ? (
            <Text size="sm" c="dimmed">
              Loading…
            </Text>
          ) : (
            <ReportTable rows={enrollments} />
          )}
        </Card>

        <Card withBorder padding="lg">
          <Text fw={600} mb={4}>
            Students
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Active vs inactive
          </Text>
          {students === null ? (
            <Text size="sm" c="dimmed">
              Loading…
            </Text>
          ) : (
            <ReportTable rows={students} />
          )}
        </Card>

        <Card withBorder padding="lg">
          <Text fw={600} mb={4}>
            Courses
          </Text>
          <Text size="sm" c="dimmed" mb="md">
            Totals and approved enrollment counts per course
          </Text>
          {courses === null ? (
            <Text size="sm" c="dimmed">
              Loading…
            </Text>
          ) : (
            <ReportTable rows={courses} />
          )}
        </Card>
      </Stack>
    </PageShell>
  )
}

function ReportTable({ rows }: { rows: ReportRow[] }) {
  return (
    <Table.ScrollContainer minWidth={320}>
      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Key</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Value</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.key}>
              <Table.Td ff="monospace" fz="xs">
                {r.key}
              </Table.Td>
              <Table.Td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.value}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
