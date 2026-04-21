import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Badge, Box, Button, Loader, Popover, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'

import { useAuth } from '@/contexts/auth-context'
import { fetchNotifications, markNotificationRead } from '@/lib/notifications-api'
import * as storage from '@/lib/auth-storage'
import type { NotificationDto } from '@/types/notification'

export function NotificationMenu() {
  const { user, loading } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationDto[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const token = storage.getToken() ?? ''

  const load = useCallback(async () => {
    if (!token) return
    setLoadingList(true)
    try {
      const list = await fetchNotifications(token)
      setItems(list)
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Error',
        message: e instanceof Error ? e.message : 'Failed to load notifications',
      })
    } finally {
      setLoadingList(false)
    }
  }, [token])

  useEffect(() => {
    if (!token || !user) return
    void load()
  }, [token, user?.id, load, user])

  useEffect(() => {
    if (!open || !token) return
    void load()
  }, [open, token, load])

  useEffect(() => {
    if (!open) return
    function handleDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleDoc)
    return () => document.removeEventListener('mousedown', handleDoc)
  }, [open])

  if (loading || !user || !token) return null

  const unread = items.filter((n) => !n.read).length

  async function onMarkRead(id: number) {
    try {
      await markNotificationRead(token, id)
      notifications.show({ color: 'teal', message: 'Marked as read' })
      await load()
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Error',
        message: e instanceof Error ? e.message : 'Failed to update',
      })
    }
  }

  return (
    <div ref={ref}>
      <Popover position="bottom-end" shadow="md" opened={open} onChange={setOpen} withArrow>
        <Popover.Target>
          <Box pos="relative" display="inline-block" style={{ overflow: 'visible' }}>
            <Button
              type="button"
              variant="default"
              size="xs"
              p={6}
              aria-label="Notifications"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              <Bell size={16} />
            </Button>
            {unread > 0 ? (
              <Badge
                size="xs"
                circle
                pos="absolute"
                top={-2}
                right={-2}
                variant="filled"
                style={{
                  minWidth: 16,
                  height: 16,
                  padding: 0,
                  fontSize: 10,
                  lineHeight: '16px',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                {unread > 9 ? '9+' : unread}
              </Badge>
            ) : null}
          </Box>
        </Popover.Target>
        <Popover.Dropdown maw={320} w={320}>
          <Text size="xs" fw={600} c="dimmed" mb="xs" px={4}>
            Notifications
          </Text>
          {loadingList ? (
            <Loader size="sm" />
          ) : items.length === 0 ? (
            <Text size="sm" c="dimmed" p="xs">
              No notifications.
            </Text>
          ) : (
            <Stack gap="xs" mih={0} mah={288} style={{ overflowY: 'auto' }} component="ul" p={0}>
              {items.map((n) => (
                <Stack
                  key={n.id}
                  component="li"
                  gap={4}
                  p="xs"
                  style={{
                    border: '1px solid var(--mantine-color-default-border)',
                    borderRadius: 'var(--mantine-radius-default)',
                    opacity: n.read ? 0.75 : 1,
                    listStyle: 'none',
                  }}
                >
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {n.body}
                  </Text>
                  {n.type ? (
                    <Text size="xs" c="dimmed">
                      {n.type}
                    </Text>
                  ) : null}
                  {!n.read ? (
                    <Button
                      type="button"
                      variant="subtle"
                      size="xs"
                      onClick={() => void onMarkRead(n.id)}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          )}
        </Popover.Dropdown>
      </Popover>
    </div>
  )
}
