import { useEffect, useState, type FormEvent } from 'react'

import { toast } from 'sonner'

import { PageHeading } from '@/components/PageHeading'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { maxWField, pageShell } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { adminCreateNotification } from '@/lib/notifications-api'
import * as storage from '@/lib/auth-storage'

type Dashboard = {
  studentCount: number
  courseCount: number
  enrollmentCounts: {
    pending: number
    approved: number
    rejected: number
    cancelled: number
  }
}

export function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyBody, setNotifyBody] = useState('')
  const [notifyBusy, setNotifyBusy] = useState(false)
  const token = storage.getToken() ?? ''

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const d = await api.get<Dashboard>('/admin/dashboard', token)
        if (!cancelled) setData(d)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load dashboard')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  async function sendNotification(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = notifyEmail.trim()
    if (!email) {
      toast.error('Enter an email address')
      return
    }
    if (!notifyBody.trim()) {
      toast.error('Enter a message')
      return
    }
    setNotifyBusy(true)
    try {
      await adminCreateNotification(token, { email, body: notifyBody.trim() })
      toast.success('Notification sent')
      setNotifyBody('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setNotifyBusy(false)
    }
  }

  return (
    <div className={pageShell}>
      <PageHeading
        title="Dashboard"
        description="Overview of students, courses, and enrollments."
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {data === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Students</CardTitle>
              <CardDescription>Active student accounts</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">{data.studentCount}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Courses</CardTitle>
              <CardDescription>Catalog size</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold tabular-nums">{data.courseCount}</CardContent>
          </Card>
          <Card className="sm:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle>Enrollments by status</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <li>
                  Pending:{' '}
                  <span className="font-medium tabular-nums">{data.enrollmentCounts.pending}</span>
                </li>
                <li>
                  Approved:{' '}
                  <span className="font-medium tabular-nums">{data.enrollmentCounts.approved}</span>
                </li>
                <li>
                  Rejected:{' '}
                  <span className="font-medium tabular-nums">{data.enrollmentCounts.rejected}</span>
                </li>
                <li>
                  Cancelled:{' '}
                  <span className="font-medium tabular-nums">{data.enrollmentCounts.cancelled}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardHeader>
              <CardTitle>Send notification</CardTitle>
              <CardDescription>
                Deliver an in-app message to a user by their email address (students and admins).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void sendNotification(e)} className={cn('flex flex-col gap-3', maxWField)}>
                <div className="space-y-2">
                  <Label htmlFor="notify-email">Email address</Label>
                  <Input
                    id="notify-email"
                    type="email"
                    autoComplete="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notify-body">Message</Label>
                  <Textarea
                    id="notify-body"
                    value={notifyBody}
                    onChange={(e) => setNotifyBody(e.target.value)}
                    rows={3}
                    placeholder="Short message shown in the notification center"
                  />
                </div>
                <Button type="submit" disabled={notifyBusy}>
                  {notifyBusy ? 'Sending…' : 'Send'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
