import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { z } from 'zod'

import { PageHeading } from '@/components/PageHeading'
import { PageShell } from '@/lib/layout'
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
  const [addPrereqId, setAddPrereqId] = useState<string | null>(null)

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
          setAddPrereqId(null)
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
      setAddPrereqId(null)
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

  const prereqSelectData = candidatePrereqs.map((c) => ({
    value: String(c.id),
    label: `${c.code} — ${c.title}`,
  }))

  return (
    <PageShell>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <PageHeading title="Courses" description="Create, edit, and link prerequisites." />
        <Button type="button" onClick={() => setCreateOpen(true)}>
          New course
        </Button>
      </Group>

      {loadError ? (
        <Text size="sm" c="red">
          {loadError}
        </Text>
      ) : null}
      {actionError ? (
        <Text size="sm" c="red">
          {actionError}
        </Text>
      ) : null}

      <Card withBorder padding="lg">
        <Text fw={600} mb={4}>
          Catalog
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          All courses in the database
        </Text>
        {rows === null ? (
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        ) : rows.length === 0 ? (
          <Text size="sm" c="dimmed">
            No courses yet.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={640}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Title</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Credits</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Filled</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Capacity</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((r) => (
                  <Table.Tr key={r.id}>
                    <Table.Td fw={500}>{r.code}</Table.Td>
                    <Table.Td>{r.title}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{r.credits}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{r.enrolledCount}</Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>{r.capacity}</Table.Td>
                    <Table.Td>
                      <Group gap="xs" justify="flex-end" wrap="wrap">
                        <Button type="button" variant="default" size="xs" onClick={() => setEditId(r.id)}>
                          Edit
                        </Button>
                        <Button type="button" variant="default" size="xs" onClick={() => setPrereqForId(r.id)}>
                          Prerequisites
                        </Button>
                        <Button type="button" color="red" size="xs" onClick={() => void handleDelete(r.id)}>
                          Delete
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="New course" size="md">
        <Text size="sm" c="dimmed" mb="md">
          Add a row to the catalog.
        </Text>
        <form onSubmit={onCreate}>
          <Stack gap="md">
            <TextInput
              label="Code"
              id="create-code"
              error={createForm.formState.errors.code?.message}
              {...createForm.register('code')}
            />
            <TextInput
              label="Title"
              id="create-title"
              error={createForm.formState.errors.title?.message}
              {...createForm.register('title')}
            />
            <Textarea label="Description" id="create-desc" rows={4} {...createForm.register('description')} />
            <TextInput
              label="Credits"
              id="create-credits"
              type="number"
              min={1}
              error={createForm.formState.errors.credits?.message}
              {...createForm.register('credits', { valueAsNumber: true })}
            />
            <TextInput
              label="Capacity"
              id="create-cap"
              type="number"
              min={1}
              error={createForm.formState.errors.capacity?.message}
              {...createForm.register('capacity', { valueAsNumber: true })}
            />
            <Group justify="flex-end" mt="md">
              <Button type="button" variant="default" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal opened={editId !== null} onClose={() => setEditId(null)} title="Edit course" size="md">
        <Text size="sm" c="dimmed" mb="md">
          Update fields and save.
        </Text>
        {detailLoading || !detail || editId === null ? (
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        ) : (
          <form onSubmit={onEdit}>
            <Stack gap="md">
              <TextInput
                label="Code"
                id="edit-code"
                error={editForm.formState.errors.code?.message}
                {...editForm.register('code')}
              />
              <TextInput
                label="Title"
                id="edit-title"
                error={editForm.formState.errors.title?.message}
                {...editForm.register('title')}
              />
              <Textarea label="Description" id="edit-desc" rows={4} {...editForm.register('description')} />
              <TextInput
                label="Credits"
                id="edit-credits"
                type="number"
                min={1}
                error={editForm.formState.errors.credits?.message}
                {...editForm.register('credits', { valueAsNumber: true })}
              />
              <TextInput
                label="Capacity"
                id="edit-cap"
                type="number"
                min={1}
                error={editForm.formState.errors.capacity?.message}
                {...editForm.register('capacity', { valueAsNumber: true })}
              />
              <Group justify="flex-end" mt="md">
                <Button type="button" variant="default" onClick={() => setEditId(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>

      <Modal opened={prereqForId !== null} onClose={() => setPrereqForId(null)} title="Prerequisites" size="md">
        <Text size="sm" c="dimmed" mb="md">
          {detail ? (
            <>
              For <Badge variant="light">{detail.code}</Badge> — courses that must be satisfied first.
            </>
          ) : (
            'Loading…'
          )}
        </Text>
        {detailLoading || !detail || prereqForId === null ? (
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        ) : (
          <Stack gap="md">
            {detail.prerequisites.length === 0 ? (
              <Text size="sm" c="dimmed">
                No prerequisites yet.
              </Text>
            ) : (
              <Stack gap="xs">
                {detail.prerequisites.map((p) => (
                  <Paper key={p.id} withBorder p="sm" radius="md">
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm">
                        {p.code} — {p.title}
                      </Text>
                      <Button
                        type="button"
                        variant="subtle"
                        size="xs"
                        onClick={() => void handleRemovePrerequisite(p)}
                      >
                        Remove
                      </Button>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Add prerequisite
              </Text>
              {candidatePrereqs.length === 0 ? (
                <Text size="xs" c="dimmed">
                  No other courses available, or all are already linked.
                </Text>
              ) : (
                <Group align="flex-end" wrap="wrap" gap="sm">
                  <Select
                    placeholder="Choose a course"
                    data={prereqSelectData}
                    value={addPrereqId}
                    onChange={setAddPrereqId}
                    searchable
                    maw={320}
                    style={{ flex: 1 }}
                  />
                  <Button type="button" onClick={() => void handleAddPrerequisite()} disabled={!addPrereqId}>
                    Add
                  </Button>
                </Group>
              )}
            </Stack>
            <Group justify="flex-end" mt="md">
              <Button type="button" variant="default" onClick={() => setPrereqForId(null)}>
                Done
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </PageShell>
  )
}

export function AdminCoursesPage() {
  return <AdminCoursesContent />
}
