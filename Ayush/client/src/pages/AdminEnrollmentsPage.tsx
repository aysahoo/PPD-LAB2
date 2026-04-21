import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

import { pageShell } from '@/lib/layout'
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
      toast.success('Enrollment approved')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed')
      toast.error(e instanceof Error ? e.message : 'Approve failed')
    } finally {
      setBusyId(null)
    }
  }

  async function reject(id: number) {
    setError(null)
    setBusyId(id)
    try {
      await api.putJson<Enrollment>(`/enrollments/${id}/reject`, {}, token)
      toast.success('Enrollment rejected')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed')
      toast.error(e instanceof Error ? e.message : 'Reject failed')
    } finally {
      setBusyId(null)
    }
  }

  const pending = rows?.filter((e) => e.status === 'PENDING') ?? []

  return (
    <div className={pageShell}>
      <PageHeading
        title="Enrollments"
        description="Approve or reject pending requests. Capacity is enforced on approve."
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Pending queue</CardTitle>
          <CardDescription>
            {pending.length === 0 && rows !== null
              ? 'No pending enrollments.'
              : 'Students waiting for approval'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{e.student.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.student.name ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/courses/${e.courseId}`}
                        className="text-sm text-primary underline-offset-4 hover:underline"
                      >
                        {e.course.code} — {e.course.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={busyId === e.id}
                          onClick={() => void approve(e.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={busyId === e.id}
                          onClick={() => void reject(e.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All enrollments</CardTitle>
          <CardDescription>Full list with status</CardDescription>
        </CardHeader>
        <CardContent>
          {rows === null ? null : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{e.student.email}</TableCell>
                    <TableCell className="text-sm">
                      {e.course.code} — {e.course.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{e.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function AdminEnrollmentsPage() {
  return <AdminEnrollmentsContent />
}
