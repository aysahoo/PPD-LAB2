import { useEffect, useState } from 'react'

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

type StudentRow = {
  id: number
  name: string | null
  email: string
  phone: string | null
  role: string
  isActive: boolean
}

export function AdminStudentsPage() {
  const [rows, setRows] = useState<StudentRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const token = storage.getToken() ?? ''

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await api.get<StudentRow[]>('/admin/students', token)
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
          <CardDescription>From GET /admin/students</CardDescription>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.email}</TableCell>
                    <TableCell>{r.name ?? '—'}</TableCell>
                    <TableCell>{r.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? 'secondary' : 'outline'}>
                        {r.isActive ? 'active' : 'inactive'}
                      </Badge>
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
