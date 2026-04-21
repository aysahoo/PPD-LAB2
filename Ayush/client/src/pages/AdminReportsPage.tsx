import { useEffect, useState } from 'react'

import { PageHeading } from '@/components/PageHeading'
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
import { pageShell } from '@/lib/layout'
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
    <div className={pageShell}>
      <PageHeading title="Reports" description="Aggregated metrics from the API." />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Enrollments</CardTitle>
          <CardDescription>Counts by status</CardDescription>
        </CardHeader>
        <CardContent>
          {enrollments === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ReportTable rows={enrollments} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>Active vs inactive</CardDescription>
        </CardHeader>
        <CardContent>
          {students === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ReportTable rows={students} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Courses</CardTitle>
          <CardDescription>Totals and approved enrollment counts per course</CardDescription>
        </CardHeader>
        <CardContent>
          {courses === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ReportTable rows={courses} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ReportTable({ rows }: { rows: ReportRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Key</TableHead>
          <TableHead className="text-right">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.key}>
            <TableCell className="font-mono text-xs">{r.key}</TableCell>
            <TableCell className="text-right tabular-nums">{r.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
