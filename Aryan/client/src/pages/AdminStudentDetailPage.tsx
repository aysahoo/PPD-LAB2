import { type ReactNode, useCallback, useEffect, useState } from 'react'
import {
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@mantine/core'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageHeading } from '@/components/PageHeading'
import { PageShell } from '@/lib/layout'
import { api } from '@/lib/api'
import * as storage from '@/lib/auth-storage'
import type { AdminStudentRecord } from '@/types/student'
import type { Enrollment } from '@/types/enrollment'

function parseStudentId(raw: string | undefined): number | null {
  if (raw === undefined) return null
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Text size="sm" c="dimmed" maw={160}>
        {label}
      </Text>
      <Text size="sm" ta="right" style={{ flex: 1, minWidth: 0 }}>
        {children}
      </Text>
    </Group>
  )
}

function enrollmentStatusBadge(status: Enrollment['status']) {
  const color =
    status === 'APPROVED'
      ? 'teal'
      : status === 'REJECTED'
        ? 'red'
        : status === 'PENDING'
          ? 'yellow'
          : 'gray'
  return (
    <Badge color={color} variant="light">
      {status}
    </Badge>
  )
}

export function AdminStudentDetailPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const studentId = parseStudentId(idParam)
  const token = storage.getToken() ?? ''

  const [student, setStudent] = useState<AdminStudentRecord | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewingDoc, setViewingDoc] = useState<null | 'aadhaar' | 'rank'>(null)
  const [docError, setDocError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (studentId === null) return
    setError(null)
    const [s, list] = await Promise.all([
      api.get<AdminStudentRecord>(`/students/${studentId}`, token),
      api.get<Enrollment[]>(`/students/${studentId}/enrollments`, token),
    ])
    setStudent(s)
    setEnrollments(list)
  }, [studentId, token])

  useEffect(() => {
    if (studentId === null) return
    let cancelled = false
    void (async () => {
      try {
        await load()
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load student')
          setStudent(null)
          setEnrollments(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [load, studentId])

  async function viewPdf(kind: 'aadhaar' | 'rank') {
    if (studentId === null) return
    setDocError(null)
    setViewingDoc(kind)
    try {
      const blob = await api.getBlob(`/students/${studentId}/documents/${kind}`, token)
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank', 'noopener,noreferrer')
      if (!win) {
        URL.revokeObjectURL(url)
        setDocError('Popup blocked — allow popups for this site to view the PDF.')
        return
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000)
    } catch (e) {
      setDocError(e instanceof Error ? e.message : 'Could not open PDF')
    } finally {
      setViewingDoc(null)
    }
  }

  if (studentId === null) {
    return (
      <PageShell>
        <PageHeading title="Student" description="Invalid student id." />
        <Button component={Link} to="/admin/students" variant="light" leftSection={<ArrowLeft size={16} />}>
          Back to students
        </Button>
      </PageShell>
    )
  }

  const title = student?.name?.trim() ? student.name : student?.email ?? 'Student'
  const subtitle = student?.name?.trim() ? student.email : undefined

  return (
    <PageShell>
      <Group>
        <Button
          component={Link}
          to="/admin/students"
          variant="subtle"
          size="xs"
          leftSection={<ArrowLeft size={16} />}
        >
          Students
        </Button>
      </Group>

      <PageHeading
        title={student ? title : 'Student'}
        description={
          student
            ? subtitle
              ? `Profile and enrollments — ${subtitle}`
              : 'Profile and enrollments for this account.'
            : 'Loading student record…'
        }
      />

      {error ? (
        <Text size="sm" c="red">
          {error}
        </Text>
      ) : null}

      {docError ? (
        <Text size="sm" c="red">
          {docError}
        </Text>
      ) : null}

      {student ? (
        <>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Card withBorder padding="lg">
              <Text fw={600} mb="md">
                Profile
              </Text>
              <Stack gap="sm">
                <DetailRow label="Email">{student.email}</DetailRow>
                <DetailRow label="Name">{student.name?.trim() ? student.name : '—'}</DetailRow>
                <DetailRow label="Phone">{student.phone?.trim() ? student.phone : '—'}</DetailRow>
                <DetailRow label="Aadhaar number">
                  {student.aadhaarNumber
                    ? `${student.aadhaarNumber.slice(0, 4)} ${student.aadhaarNumber.slice(4, 8)} ${student.aadhaarNumber.slice(8, 12)}`
                    : '—'}
                </DetailRow>
                <DetailRow label="Rank">{student.studentRank != null ? String(student.studentRank) : '—'}</DetailRow>
                <DetailRow label="Status">
                  <Badge color={student.isActive ? 'teal' : 'gray'} variant="light">
                    {student.isActive ? 'active' : 'inactive'}
                  </Badge>
                </DetailRow>
              </Stack>
            </Card>

            <Card withBorder padding="lg">
              <Text fw={600} mb={4}>
                Documents
              </Text>
              <Text size="sm" c="dimmed" mb="md">
                PDFs on file for this student.
              </Text>
              <Stack gap="md">
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    Aadhaar PDF
                  </Text>
                  <Text size="xs" c="dimmed">
                    {student.aadhaarPdfUploaded ? 'Uploaded' : 'Not uploaded'}
                  </Text>
                  {student.aadhaarPdfUploaded ? (
                    <Button
                      type="button"
                      variant="light"
                      size="sm"
                      loading={viewingDoc === 'aadhaar'}
                      disabled={viewingDoc !== null}
                      onClick={() => void viewPdf('aadhaar')}
                    >
                      View PDF
                    </Button>
                  ) : null}
                </Stack>
                <Stack gap="xs">
                  <Text size="sm" fw={500}>
                    Rank PDF
                  </Text>
                  <Text size="xs" c="dimmed">
                    {student.rankPdfUploaded ? 'Uploaded' : 'Not uploaded'}
                  </Text>
                  {student.rankPdfUploaded ? (
                    <Button
                      type="button"
                      variant="light"
                      size="sm"
                      loading={viewingDoc === 'rank'}
                      disabled={viewingDoc !== null}
                      onClick={() => void viewPdf('rank')}
                    >
                      View PDF
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
            </Card>
          </SimpleGrid>

          <Card withBorder padding="lg">
            <Text fw={600} mb="md">
              Enrollments
            </Text>
            {enrollments === null ? (
              <Text size="sm" c="dimmed">
                Loading…
              </Text>
            ) : enrollments.length === 0 ? (
              <Text size="sm" c="dimmed">
                No enrollments yet.
              </Text>
            ) : (
              <Table.ScrollContainer minWidth={520}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Course</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Updated</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {enrollments.map((e) => (
                      <Table.Tr key={e.id}>
                        <Table.Td>
                          <Anchor component={Link} to={`/courses/${e.courseId}`} size="sm">
                            {e.course.code} — {e.course.title}
                          </Anchor>
                        </Table.Td>
                        <Table.Td>{enrollmentStatusBadge(e.status)}</Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">
                            {new Date(e.updatedAt).toLocaleString()}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Card>
        </>
      ) : !error ? (
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      ) : null}
    </PageShell>
  )
}
