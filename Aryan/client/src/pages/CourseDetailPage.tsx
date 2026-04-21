import { useCallback, useEffect, useState } from 'react'
import { Alert, Anchor, Badge, Button, Card, Group, Skeleton, Stack, Text } from '@mantine/core'
import { Link, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeading } from '@/components/PageHeading'
import { PageShell, ShellRow } from '@/lib/layout'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import * as storage from '@/lib/auth-storage'
import type { Course } from '@/types/course'
import type { Enrollment } from '@/types/enrollment'

function enrollmentBadgeColor(s: Enrollment['status']) {
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

/** Matches server enrollment profile rules — lists what is still missing. */
function studentProfileIncompleteHint(user: {
  name: string | null
  phone: string | null
  aadhaarNumber: string | null
  studentRank: number | null
  aadhaarPdfUploaded: boolean
  rankPdfUploaded: boolean
}): string {
  const missing: string[] = []
  if ((user.name?.trim() ?? '').length === 0) missing.push('name')
  if ((user.phone?.trim() ?? '').length === 0) missing.push('phone')
  const aadhaarDigits = (user.aadhaarNumber ?? '').replace(/\D/g, '')
  if (aadhaarDigits.length !== 12) missing.push('12-digit Aadhaar')
  if (user.studentRank == null || !Number.isFinite(user.studentRank) || user.studentRank <= 0) {
    missing.push('rank')
  }
  if (!user.aadhaarPdfUploaded) missing.push('Aadhaar PDF')
  if (!user.rankPdfUploaded) missing.push('rank PDF')
  if (missing.length === 0) return 'Complete your profile'
  return `Add ${missing.join(', ')}`
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mine, setMine] = useState<Enrollment[] | null>(null)
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [enrolling, setEnrolling] = useState(false)

  const token = storage.getToken() ?? ''
  const courseIdNum = id ? Number(id) : NaN

  const refreshMine = useCallback(async () => {
    if (!token || user?.role !== 'student' || !Number.isFinite(courseIdNum)) {
      setMine([])
      return
    }
    try {
      const list = await api.get<Enrollment[]>('/enrollments/mine', token)
      setMine(list)
    } catch {
      setMine([])
    }
  }, [token, user?.role, courseIdNum])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    void (async () => {
      try {
        const c = await api.getPublic<Course>(`/courses/${id}`)
        if (!cancelled) setCourse(c)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load course')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (authLoading) return
    void refreshMine()
  }, [authLoading, refreshMine])

  async function handleEnroll() {
    if (!Number.isFinite(courseIdNum)) return
    setEnrollError(null)
    setEnrolling(true)
    try {
      await api.postJson<Enrollment>('/enrollments', { courseId: courseIdNum }, token)
      await refreshMine()
    } catch (e) {
      setEnrollError(e instanceof Error ? e.message : 'Could not enroll')
    } finally {
      setEnrolling(false)
    }
  }

  const myEnrollment =
    mine && Number.isFinite(courseIdNum) ? mine.find((e) => e.courseId === courseIdNum) : undefined

  if (!id) {
    return (
      <ShellRow>
        <Text py="xl" size="sm" c="red">
          Invalid course.
        </Text>
      </ShellRow>
    )
  }

  return (
    <PageShell>
      {error ? (
        <>
          <Breadcrumbs
            items={[
              { label: 'Home', to: '/' },
              { label: 'Courses', to: '/courses' },
              { label: 'Course' },
            ]}
          />
          <Text size="sm" c="red" role="alert">
            {error}
          </Text>
        </>
      ) : !course ? (
        <>
          <Breadcrumbs
            items={[
              { label: 'Home', to: '/' },
              { label: 'Courses', to: '/courses' },
              { label: 'Loading…' },
            ]}
          />
          <Stack gap="md" aria-busy="true" aria-label="Loading course">
            <Stack gap="xs">
              <Skeleton height={32} width="100%" maw={512} />
              <Skeleton height={16} width={128} />
            </Stack>
            <Card withBorder padding="lg">
              <Skeleton height={20} width={160} mb="sm" />
              <Skeleton height={16} width={96} mb="md" />
              <Stack gap="xs">
                <Skeleton height={16} />
                <Skeleton height={16} />
                <Skeleton height={16} width="66%" />
              </Stack>
            </Card>
          </Stack>
        </>
      ) : (
        <>
          <Breadcrumbs
            items={[
              { label: 'Home', to: '/' },
              { label: 'Courses', to: '/courses' },
              { label: course.code },
            ]}
          />
          <PageHeading
            title={`${course.code} — ${course.title}`}
            description={`${course.credits} credits · capacity ${course.capacity}`}
          />

          <Card withBorder padding="lg">
            <Text fw={600} mb="xs">
              Description
            </Text>
            <Text size="sm" c="dimmed" mb="sm">
              Overview
            </Text>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} lh={1.6}>
              {course.description}
            </Text>
          </Card>

          <Card withBorder padding="lg">
            <Text fw={600} mb="xs">
              Prerequisites
            </Text>
            <Text size="sm" c="dimmed" mb="sm">
              Courses to complete before enrolling
            </Text>
            {course.prerequisites.length === 0 ? (
              <Text size="sm" c="dimmed">
                None listed.
              </Text>
            ) : (
              <Stack component="ul" gap="xs" style={{ paddingLeft: '1.25rem' }}>
                {course.prerequisites.map((p) => (
                  <Text component="li" key={p.id} size="sm">
                    <Anchor component={Link} to={`/courses/${p.id}`} size="sm">
                      {p.code} — {p.title}
                    </Anchor>
                  </Text>
                ))}
              </Stack>
            )}
          </Card>

          <Card withBorder padding="lg">
            <Text fw={600} mb="xs">
              Enrollment
            </Text>
            <Text size="sm" c="dimmed" mb="md">
              Request access to this course (requires approved prerequisites).
            </Text>
            <Stack gap="sm">
              {authLoading ? (
                <Text size="sm" c="dimmed">
                  Checking session…
                </Text>
              ) : !user ? (
                <Text size="sm" c="dimmed">
                  <Anchor component={Link} to="/login" size="sm">
                    Sign in
                  </Anchor>{' '}
                  as a student to request enrollment.
                </Text>
              ) : user.role === 'admin' ? (
                <Text size="sm" c="dimmed">
                  Administrators manage enrollments from the admin area.
                </Text>
              ) : user.role === 'student' && !user.profileComplete ? (
                <Stack gap="sm">
                  <Alert color="yellow" title="Complete your profile">
                    {studentProfileIncompleteHint(user)} on{' '}
                    <Anchor component={Link} to="/account" size="sm">
                      Account
                    </Anchor>{' '}
                    before you can request enrollment.
                  </Alert>
                  {mine === null ? (
                    <Text size="sm" c="dimmed">
                      Loading enrollment status…
                    </Text>
                  ) : (
                    <>
                      {myEnrollment ? (
                        <Group gap="sm">
                          <Text size="sm">Your status:</Text>
                          <Badge color={enrollmentBadgeColor(myEnrollment.status)}>
                            {myEnrollment.status}
                          </Badge>
                        </Group>
                      ) : null}
                      {myEnrollment &&
                      (myEnrollment.status === 'PENDING' || myEnrollment.status === 'APPROVED') ? (
                        <Text size="xs" c="dimmed">
                          To cancel, use{' '}
                          <Anchor component={Link} to="/enrollments" size="xs">
                            My enrollments
                          </Anchor>
                          .
                        </Text>
                      ) : null}
                    </>
                  )}
                </Stack>
              ) : mine === null ? (
                <Text size="sm" c="dimmed">
                  Loading enrollment status…
                </Text>
              ) : (
                <>
                  {myEnrollment ? (
                    <Group gap="sm">
                      <Text size="sm">Your status:</Text>
                      <Badge color={enrollmentBadgeColor(myEnrollment.status)}>{myEnrollment.status}</Badge>
                    </Group>
                  ) : null}
                  {myEnrollment && (myEnrollment.status === 'REJECTED' || myEnrollment.status === 'CANCELLED') ? (
                    <Button type="button" onClick={() => void handleEnroll()} loading={enrolling}>
                      {enrolling ? 'Submitting…' : 'Request again'}
                    </Button>
                  ) : null}
                  {!myEnrollment ? (
                    <Button type="button" onClick={() => void handleEnroll()} loading={enrolling}>
                      {enrolling ? 'Submitting…' : 'Request enrollment'}
                    </Button>
                  ) : null}
                  {myEnrollment && (myEnrollment.status === 'PENDING' || myEnrollment.status === 'APPROVED') ? (
                    <Text size="xs" c="dimmed">
                      To cancel, use{' '}
                      <Anchor component={Link} to="/enrollments" size="xs">
                        My enrollments
                      </Anchor>
                      .
                    </Text>
                  ) : null}
                  {enrollError ? (
                    <Text size="sm" c="red">
                      {enrollError}
                    </Text>
                  ) : null}
                </>
              )}
            </Stack>
          </Card>
        </>
      )}
    </PageShell>
  )
}
