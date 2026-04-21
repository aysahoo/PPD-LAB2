import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Badge, Button, Card, Group, Modal, Stack, Table, Text, TextInput } from '@mantine/core'
import { z } from 'zod'

import { PageHeading } from '@/components/PageHeading'
import { PageShell } from '@/lib/layout'
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
    <PageShell>
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <PageHeading title="Administrators" description="Create and manage admin accounts." />
        <Button type="button" onClick={() => setOpen(true)}>
          New admin
        </Button>
      </Group>

      {error ? (
        <Text size="sm" c="red">
          {error}
        </Text>
      ) : null}

      <Card withBorder padding="lg">
        <Text fw={600} mb={4}>
          Accounts
        </Text>
        <Text size="sm" c="dimmed" mb="md">
          You cannot deactivate yourself or the last active admin.
        </Text>
        {rows === null ? (
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        ) : rows.length === 0 ? (
          <Text size="sm" c="dimmed">
            No admins.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={500}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((r) => (
                  <Table.Tr key={r.id}>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {r.email}
                      </Text>
                    </Table.Td>
                    <Table.Td>{r.name ?? '—'}</Table.Td>
                    <Table.Td>
                      <Badge color={r.isActive ? 'teal' : 'gray'} variant="light">
                        {r.isActive ? 'active' : 'inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end">
                        <Button
                          type="button"
                          color="red"
                          size="xs"
                          disabled={busyId === r.id || r.id === user?.id || !r.isActive}
                          onClick={() => void deactivate(r.id)}
                        >
                          Deactivate
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

      <Modal opened={open} onClose={() => setOpen(false)} title="New administrator" size="md">
        <Text size="sm" c="dimmed" mb="md">
          Creates an account with role admin.
        </Text>
        <form onSubmit={onCreate}>
          <Stack gap="md">
            <TextInput
              label="Email"
              id="adm-email"
              type="email"
              error={form.formState.errors.email?.message}
              {...form.register('email')}
            />
            <TextInput
              label="Password"
              id="adm-pass"
              type="password"
              error={form.formState.errors.password?.message}
              {...form.register('password')}
            />
            <TextInput label="Name (optional)" id="adm-name" {...form.register('name')} />
            <TextInput label="Phone (optional)" id="adm-phone" {...form.register('phone')} />
            <Group justify="flex-end" mt="md">
              <Button type="button" variant="default" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </PageShell>
  )
}
