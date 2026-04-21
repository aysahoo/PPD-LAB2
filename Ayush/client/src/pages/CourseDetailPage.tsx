import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeading } from '@/components/PageHeading'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { pageShell, shellInnerRow } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import * as storage from '@/lib/auth-storage'
import type { Course } from '@/types/course'
import type { Enrollment } from '@/types/enrollment'

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
    mine && Number.isFinite(courseIdNum)
      ? mine.find((e) => e.courseId === courseIdNum)
      : undefined

  if (!id) {
    return <p className={cn(shellInnerRow, 'py-6 text-sm text-destructive')}>Invalid course.</p>
  }

  return (
    <div className={pageShell}>
      {error ? (
        <>
          <Breadcrumbs
            items={[
              { label: 'Home', to: '/' },
              { label: 'Courses', to: '/courses' },
              { label: 'Course' },
            ]}
          />
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
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
          <div className="space-y-4" aria-busy="true" aria-label="Loading course">
            <div className="space-y-2">
              <Skeleton className="h-8 w-full max-w-lg" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          </div>
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

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
              <CardDescription>Overview</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{course.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prerequisites</CardTitle>
              <CardDescription>Courses to complete before enrolling</CardDescription>
            </CardHeader>
            <CardContent>
              {course.prerequisites.length === 0 ? (
                <p className="text-sm text-muted-foreground">None listed.</p>
              ) : (
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {course.prerequisites.map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/courses/${p.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {p.code} — {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enrollment</CardTitle>
              <CardDescription>
                Request access to this course (requires approved prerequisites).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {authLoading ? (
                <p className="text-sm text-muted-foreground">Checking session…</p>
              ) : !user ? (
                <p className="text-sm text-muted-foreground">
                  <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                    Sign in
                  </Link>{' '}
                  as a student to request enrollment.
                </p>
              ) : user.role === 'admin' ? (
                <p className="text-sm text-muted-foreground">
                  Administrators manage enrollments from the admin area.
                </p>
              ) : user.role === 'student' && !user.profileComplete ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {studentProfileIncompleteHint(user)} on{' '}
                    <Link to="/account" className="text-primary underline-offset-4 hover:underline">
                      Account
                    </Link>{' '}
                    before you can request enrollment.
                  </p>
                  {mine === null ? (
                    <p className="text-sm text-muted-foreground">Loading enrollment status…</p>
                  ) : (
                    <>
                      {myEnrollment ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm">Your status:</span>
                          <Badge
                            variant={
                              myEnrollment.status === 'APPROVED'
                                ? 'default'
                                : myEnrollment.status === 'PENDING'
                                  ? 'secondary'
                                  : myEnrollment.status === 'REJECTED'
                                    ? 'destructive'
                                    : 'outline'
                            }
                          >
                            {myEnrollment.status}
                          </Badge>
                        </div>
                      ) : null}
                      {myEnrollment &&
                      (myEnrollment.status === 'PENDING' || myEnrollment.status === 'APPROVED') ? (
                        <p className="text-xs text-muted-foreground">
                          To cancel, use{' '}
                          <Link
                            to="/enrollments"
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            My enrollments
                          </Link>
                          .
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              ) : mine === null ? (
                <p className="text-sm text-muted-foreground">Loading enrollment status…</p>
              ) : (
                <>
                  {myEnrollment ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm">Your status:</span>
                      <Badge
                        variant={
                          myEnrollment.status === 'APPROVED'
                            ? 'default'
                            : myEnrollment.status === 'PENDING'
                              ? 'secondary'
                              : myEnrollment.status === 'REJECTED'
                                ? 'destructive'
                                : 'outline'
                        }
                      >
                        {myEnrollment.status}
                      </Badge>
                    </div>
                  ) : null}
                  {myEnrollment &&
                  (myEnrollment.status === 'REJECTED' || myEnrollment.status === 'CANCELLED') ? (
                    <Button
                      type="button"
                      onClick={() => void handleEnroll()}
                      disabled={enrolling}
                    >
                      {enrolling ? 'Submitting…' : 'Request again'}
                    </Button>
                  ) : null}
                  {!myEnrollment ? (
                    <Button
                      type="button"
                      onClick={() => void handleEnroll()}
                      disabled={enrolling}
                    >
                      {enrolling ? 'Submitting…' : 'Request enrollment'}
                    </Button>
                  ) : null}
                  {myEnrollment &&
                  (myEnrollment.status === 'PENDING' || myEnrollment.status === 'APPROVED') ? (
                    <p className="text-xs text-muted-foreground">
                      To cancel, use{' '}
                      <Link
                        to="/enrollments"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        My enrollments
                      </Link>
                      .
                    </p>
                  ) : null}
                  {enrollError ? (
                    <p className="text-sm text-destructive">{enrollError}</p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
