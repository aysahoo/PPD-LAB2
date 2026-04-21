import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PageHeading } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { breadcrumbPresets } from '@/lib/breadcrumb-presets'
import { pageIntroStack, pageLoadingCenter, pageShell, pageShellNarrow } from '@/lib/layout'
import { useAuth } from '@/contexts/auth-context'
import { api } from '@/lib/api'
import * as storage from '@/lib/auth-storage'
import type { Enrollment } from '@/types/enrollment'

function statusVariant(
  s: Enrollment['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (s) {
    case 'APPROVED':
      return 'default'
    case 'PENDING':
      return 'secondary'
    case 'REJECTED':
      return 'destructive'
    default:
      return 'outline'
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
        /* keep polling; next manual load will surface errors */
      })
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [loading, user, refresh])

  async function handleCancel(id: number) {
    if (!window.confirm('Cancel this enrollment?')) return
    setError(null)
    try {
      await api.delete(`/enrollments/${id}`, token)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel')
    }
  }

  if (loading) {
    return <div className={pageLoadingCenter}>Loading…</div>
  }

  if (!user) {
    return null
  }

  if (user.role === 'admin') {
    return (
      <div className={pageShellNarrow}>
        <div className={pageIntroStack}>
          <Breadcrumbs items={breadcrumbPresets.enrollments} />
          <Card>
            <CardHeader>
              <CardTitle>Student enrollments</CardTitle>
              <CardDescription>
                Your account is an administrator. Use{' '}
                <Link to="/admin/enrollments" className="text-primary underline-offset-4 hover:underline">
                  Admin — Enrollments
                </Link>{' '}
                to approve or reject requests.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className={pageShell}>
      <div className={pageIntroStack}>
        <Breadcrumbs items={breadcrumbPresets.enrollments} />
        <PageHeading
          title="My enrollments"
          description="Status for each course you requested. You can cancel pending or approved requests here."
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {rows === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No enrollments yet.{' '}
          <Link to="/courses" className="text-primary underline-offset-4 hover:underline">
            Browse courses
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((e) => (
            <li key={e.id}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle>
                      <Link
                        to={`/courses/${e.courseId}`}
                        className="hover:underline"
                      >
                        {e.course.code} — {e.course.title}
                      </Link>
                    </CardTitle>
                    <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                  </div>
                  <CardDescription>
                    Requested {new Date(e.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                {(e.status === 'PENDING' || e.status === 'APPROVED') && (
                  <CardContent className="pt-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCancel(e.id)}
                    >
                      Cancel enrollment
                    </Button>
                  </CardContent>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function EnrollmentsPage() {
  return <EnrollmentsContent />
}
