import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeading } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
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
    <div className={pageShell}>
      <PageHeading title="Students" description="All student accounts." />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>Open a student to view profile, documents, and enrollments.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px] text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/admin/students/${r.id}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {r.email}
                      </Link>
                    </TableCell>
                    <TableCell>{r.name ?? '—'}</TableCell>
                    <TableCell>{r.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? 'secondary' : 'outline'}>
                        {r.isActive ? 'active' : 'inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/admin/students/${r.id}`}
                        className="text-sm text-primary underline-offset-4 hover:underline"
                      >
                        View
                      </Link>
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
