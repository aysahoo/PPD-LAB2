import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { fullScreenLoading } from '@/lib/layout'
import { useAuth } from '@/contexts/auth-context'

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className={fullScreenLoading}>Loading…</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
