import { api } from '@/lib/api'

import type { NotificationDto } from '@/types/notification'

export async function fetchNotifications(token: string): Promise<NotificationDto[]> {
  return api.get<NotificationDto[]>('/notifications', token)
}

export async function markNotificationRead(
  token: string,
  id: number,
): Promise<{ message: string }> {
  return api.putJson<{ message: string }>(`/notifications/${id}/read`, {}, token)
}

export async function adminCreateNotification(
  token: string,
  body: { email: string; body: string; type?: string | null },
): Promise<NotificationDto> {
  return api.postJson<NotificationDto>('/notifications', body, token)
}
