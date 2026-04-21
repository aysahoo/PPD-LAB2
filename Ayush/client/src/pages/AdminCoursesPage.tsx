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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { pageShell } from '@/lib/layout'
import { api } from '@/lib/api'
import * as storage from '@/lib/auth-storage'
import type { Course, PrerequisiteSummary } from '@/types/course'

const courseFormSchema = z.object({
  code: z.string().min(1, 'Required').max(32),
  title: z.string().min(1, 'Required').max(200),
  description: z.string(),
  credits: z.coerce.number().int().positive(),
  capacity: z.coerce.number().int().positive(),
})

type CourseFormValues = z.infer<typeof courseFormSchema>

function AdminCoursesContent() {
  const [rows, setRows] = useState<Course[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [prereqForId, setPrereqForId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Course | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [addPrereqId, setAddPrereqId] = useState<string>('')

  const token = storage.getToken() ?? ''

  const refreshList = useCallback(async () => {
    const list = await api.getPublic<Course[]>('/courses')
    setRows(list)
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        await refreshList()
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load courses')
      }
    })()
  }, [refreshList])

  const createForm = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: { code: '', title: '', description: '', credits: 3, capacity: 30 },
  })

  const editForm = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: { code: '', title: '', description: '', credits: 3, capacity: 1 },
  })

  useEffect(() => {
    if (editId === null) return
    let cancelled = false
    void (async () => {
      setDetailLoading(true)
      setActionError(null)
      try {
        const c = await api.getPublic<Course>(`/courses/${editId}`)
        if (cancelled) return
        setDetail(c)
        editForm.reset({
          code: c.code,
          title: c.title,
          description: c.description,
          credits: c.credits,
          capacity: c.capacity,
        })
      } catch (e) {
        if (!cancelled) {
          setActionError(e instanceof Error ? e.message : 'Failed to load course')
        }
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [editId, editForm])

  useEffect(() => {
    if (prereqForId === null) return
    let cancelled = false
    void (async () => {
      setDetailLoading(true)
      setActionError(null)
      try {
        const c = await api.getPublic<Course>(`/courses/${prereqForId}`)
        if (!cancelled) {
          setDetail(c)
          setAddPrereqId('')
        }
      } catch (e) {
        if (!cancelled) {
          setActionError(e instanceof Error ? e.message : 'Failed to load course')
        }
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [prereqForId])

  const onCreate = createForm.handleSubmit(async (data) => {
    setActionError(null)
    try {
      await api.postJson<Course>('/courses', data, token)
      setCreateOpen(false)
      createForm.reset({ code: '', title: '', description: '', credits: 3, capacity: 30 })
      await refreshList()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Create failed')
    }
  })

  const onEdit = editForm.handleSubmit(async (data) => {
    if (editId === null) return
    setActionError(null)
    try {
      await api.putJson<Course>(`/courses/${editId}`, data, token)
      setEditId(null)
      await refreshList()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Update failed')
    }
  })

  async function handleDelete(id: number) {
    if (!window.confirm('Delete this course? Prerequisites are removed automatically.')) return
    setActionError(null)
    try {
      await api.delete<{ message: string }>(`/courses/${id}`, token)
      await refreshList()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  async function handleAddPrerequisite() {
    if (prereqForId === null || !addPrereqId) return
    const prerequisiteCourseId = Number(addPrereqId)
    setActionError(null)
    try {
      await api.postJson(
        `/courses/${prereqForId}/prerequisites`,
        { prerequisiteCourseId },
        token,
      )
      const c = await api.getPublic<Course>(`/courses/${prereqForId}`)
      setDetail(c)
      setAddPrereqId('')
      await refreshList()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not add prerequisite')
    }
  }

  async function handleRemovePrerequisite(prereq: PrerequisiteSummary) {
    if (prereqForId === null) return
    setActionError(null)
    try {
      await api.delete<{ message: string }>(
        `/courses/${prereqForId}/prerequisites/${prereq.id}`,
        token,
      )
      const c = await api.getPublic<Course>(`/courses/${prereqForId}`)
      setDetail(c)
      await refreshList()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not remove prerequisite')
    }
  }

  const candidatePrereqs: { id: number; code: string; title: string }[] =
    rows && detail && prereqForId !== null
      ? rows.filter(
          (r) =>
            r.id !== prereqForId &&
            !detail.prerequisites.some((p) => p.id === r.id),
        )
      : []

  return (
    <div className={pageShell}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeading title="Courses" description="Create, edit, and link prerequisites." />
        <Button type="button" onClick={() => setCreateOpen(true)}>
          New course
        </Button>
      </div>

      {loadError ? (
        <p className="text-sm text-destructive">{loadError}</p>
      ) : null}
      {actionError ? (
        <p className="text-sm text-destructive">{actionError}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
          <CardDescription>All courses in the database</CardDescription>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Capacity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.code}</TableCell>
                    <TableCell>{r.title}</TableCell>
                    <TableCell className="text-right">{r.credits}</TableCell>
                    <TableCell className="text-right">{r.capacity}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditId(r.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPrereqForId(r.id)}
                        >
                          Prerequisites
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleDelete(r.id)}
                        >
                          Delete
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New course</DialogTitle>
            <DialogDescription>Add a row to the catalog.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="create-code">Code</Label>
              <Input id="create-code" {...createForm.register('code')} />
              {createForm.formState.errors.code ? (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.code.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-title">Title</Label>
              <Input id="create-title" {...createForm.register('title')} />
              {createForm.formState.errors.title ? (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.title.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-desc">Description</Label>
              <Textarea id="create-desc" rows={4} {...createForm.register('description')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-credits">Credits</Label>
              <Input id="create-credits" type="number" min={1} {...createForm.register('credits')} />
              {createForm.formState.errors.credits ? (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.credits.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-cap">Capacity</Label>
              <Input id="create-cap" type="number" min={1} {...createForm.register('capacity')} />
              {createForm.formState.errors.capacity ? (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.capacity.message}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editId !== null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit course</DialogTitle>
            <DialogDescription>Update fields and save.</DialogDescription>
          </DialogHeader>
          {detailLoading || !detail || editId === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <form onSubmit={onEdit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Code</Label>
                <Input id="edit-code" {...editForm.register('code')} />
                {editForm.formState.errors.code ? (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.code.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" {...editForm.register('title')} />
                {editForm.formState.errors.title ? (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.title.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Description</Label>
                <Textarea id="edit-desc" rows={4} {...editForm.register('description')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-credits">Credits</Label>
                <Input id="edit-credits" type="number" min={1} {...editForm.register('credits')} />
                {editForm.formState.errors.credits ? (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.credits.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cap">Capacity</Label>
                <Input id="edit-cap" type="number" min={1} {...editForm.register('capacity')} />
                {editForm.formState.errors.capacity ? (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.capacity.message}
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditId(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={prereqForId !== null} onOpenChange={(o) => !o && setPrereqForId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Prerequisites</DialogTitle>
            <DialogDescription>
              {detail ? (
                <>
                  For <Badge variant="secondary">{detail.code}</Badge> — courses that must be
                  satisfied first.
                </>
              ) : (
                'Loading…'
              )}
            </DialogDescription>
          </DialogHeader>
          {detailLoading || !detail || prereqForId === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="space-y-4">
              {detail.prerequisites.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prerequisites yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {detail.prerequisites.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <span>
                        {p.code} — {p.title}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleRemovePrerequisite(p)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="space-y-2">
                <Label>Add prerequisite</Label>
                {candidatePrereqs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No other courses available, or all are already linked.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <Select
                      value={addPrereqId}
                      onValueChange={(v) => setAddPrereqId(v ?? '')}
                    >
                      <SelectTrigger className="w-full sm:min-w-[220px]">
                        <SelectValue placeholder="Choose a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {candidatePrereqs.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.code} — {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      onClick={() => void handleAddPrerequisite()}
                      disabled={!addPrereqId}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPrereqForId(null)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function AdminCoursesPage() {
  return <AdminCoursesContent />
}
