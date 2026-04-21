import type { ReactNode } from 'react'
import { Text } from '@mantine/core'
import { Navigate, useLocation } from 'react-router-dom'

import { FullScreenLoading } from '@/lib/layout'
import { useAuth } from '@/contexts/auth-context'

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <FullScreenLoading>
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      </FullScreenLoading>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
