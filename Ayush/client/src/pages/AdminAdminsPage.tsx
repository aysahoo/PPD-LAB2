import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useAuth } from '@/contexts/auth-context'

type AdminRow = {
  id: number
  name: string | null
  email: string
  phone: string | null
  role: string
  isActive: boolean
}

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().max(100).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
})

type CreateValues = z.infer<typeof createSchema>

export function AdminAdminsPage() {
  const { user, refreshUser } = useAuth()
  const [rows, setRows] = useState<AdminRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const token = storage.getToken() ?? ''

  const refresh = useCallback(async () => {
    const list = await api.get<AdminRow[]>('/admin/admins', token)
    setRows(list)
  }, [token])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await refresh()
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load admins')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { email: '', password: '', name: '', phone: '' },
  })

  const onCreate = form.handleSubmit(async (data) => {
    setError(null)
    try {
      await api.postJson<AdminRow>(
        '/admin/admins',
        {
          email: data.email,
          password: data.password,
          name: data.name || undefined,
          phone: data.phone || undefined,
        },
        token,
      )
      setOpen(false)
      form.reset({ email: '', password: '', name: '', phone: '' })
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    }
  })

  async function deactivate(id: number) {
    if (!window.confirm('Deactivate this admin?')) return
    setError(null)
    setBusyId(id)
    try {
      await api.delete(`/admin/admins/${id}`, token)
      await refresh()
      await refreshUser()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not deactivate')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={pageShell}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading title="Administrators" description="Create and manage admin accounts." />
        <Button type="button" onClick={() => setOpen(true)}>
          New admin
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>You cannot deactivate yourself or the last active admin.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admins.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.email}</TableCell>
                    <TableCell>{r.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? 'secondary' : 'outline'}>
                        {r.isActive ? 'active' : 'inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={busyId === r.id || r.id === user?.id || !r.isActive}
                        onClick={() => void deactivate(r.id)}
                      >
                        Deactivate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New administrator</DialogTitle>
            <DialogDescription>Creates an account with role admin.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="adm-email">Email</Label>
              <Input id="adm-email" type="email" {...form.register('email')} />
              {form.formState.errors.email ? (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm-pass">Password</Label>
              <Input id="adm-pass" type="password" {...form.register('password')} />
              {form.formState.errors.password ? (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm-name">Name (optional)</Label>
              <Input id="adm-name" {...form.register('name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adm-phone">Phone (optional)</Label>
              <Input id="adm-phone" {...form.register('phone')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
