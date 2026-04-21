import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
      toast.error(e instanceof Error ? e.message : 'Failed to load notifications')
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
      toast.success('Marked as read')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update')
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="relative shrink-0"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none text-primary-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-md border bg-popover p-2 text-popover-foreground"
          role="dialog"
          aria-label="Notification list"
        >
          <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">Notifications</p>
          {loadingList ? (
            <p className="p-2 text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {!loadingList && items.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">No notifications.</p>
          ) : null}
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {items.map((n) => (
              <li
                key={n.id}
                className={`rounded border p-2 text-sm ${n.read ? 'opacity-70' : ''}`}
              >
                <p className="whitespace-pre-wrap">{n.body}</p>
                {n.type ? (
                  <p className="mt-1 text-xs text-muted-foreground">{n.type}</p>
                ) : null}
                {!n.read ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-8 px-2 text-xs"
                    onClick={() => void onMarkRead(n.id)}
                  >
                    Mark read
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
