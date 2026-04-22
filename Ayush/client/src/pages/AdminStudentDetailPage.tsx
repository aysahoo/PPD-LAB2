import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageHeading } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import * as storage from '@/lib/auth-storage'
import type { AdminStudentRecord } from '@/types/student'
import type { Enrollment } from '@/types/enrollment'

function parseStudentId(raw: string | undefined): number | null {
  if (raw === undefined) return null
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : null
}

function enrollmentBadgeVariant(
  status: Enrollment['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'APPROVED') return 'default'
  if (status === 'REJECTED') return 'destructive'
  if (status === 'PENDING') return 'secondary'
  return 'outline'
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
      <div className={pageShell}>
        <PageHeading title="Student" description="Invalid student id." />
        <Link
          to="/admin/students"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex')}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to students
        </Link>
      </div>
    )
  }

  const title = student?.name?.trim() ? student.name : student?.email ?? 'Student'
  const subtitle = student?.name?.trim() ? student.email : undefined

  return (
    <div className={pageShell}>
      <div className="mb-4">
        <Link
          to="/admin/students"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'inline-flex')}
        >
          <ArrowLeft className="mr-2 size-4" />
          Students
        </Link>
      </div>

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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {docError ? <p className="text-sm text-destructive">{docError}</p> : null}

      {student ? (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Email</span>
                <span className="min-w-0 text-right font-medium">{student.email}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Name</span>
                <span className="min-w-0 text-right">{student.name?.trim() ? student.name : '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Phone</span>
                <span className="min-w-0 text-right">{student.phone?.trim() ? student.phone : '—'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Aadhaar number</span>
                <span className="min-w-0 text-right tabular-nums">
                  {student.aadhaarNumber
                    ? `${student.aadhaarNumber.slice(0, 4)} ${student.aadhaarNumber.slice(4, 8)} ${student.aadhaarNumber.slice(8, 12)}`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Rank</span>
                <span className="min-w-0 text-right">
                  {student.studentRank != null ? String(student.studentRank) : '—'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={student.isActive ? 'secondary' : 'outline'}>
                  {student.isActive ? 'active' : 'inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>PDFs on file for this student.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Aadhaar PDF</p>
                <p className="text-xs text-muted-foreground">
                  {student.aadhaarPdfUploaded ? 'Uploaded' : 'Not uploaded'}
                </p>
                {student.aadhaarPdfUploaded ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={viewingDoc !== null}
                    onClick={() => void viewPdf('aadhaar')}
                  >
                    {viewingDoc === 'aadhaar' ? 'Opening…' : 'View PDF'}
                  </Button>
                ) : null}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Rank PDF</p>
                <p className="text-xs text-muted-foreground">
                  {student.rankPdfUploaded ? 'Uploaded' : 'Not uploaded'}
                </p>
                {student.rankPdfUploaded ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={viewingDoc !== null}
                    onClick={() => void viewPdf('rank')}
                  >
                    {viewingDoc === 'rank' ? 'Opening…' : 'View PDF'}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollments === null ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No enrollments yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <Link
                            to={`/courses/${e.courseId}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {e.course.code} — {e.course.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={enrollmentBadgeVariant(e.status)}>{e.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {new Date(e.updatedAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : !error ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}
    </div>
  )
}
