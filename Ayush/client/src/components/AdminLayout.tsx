import { NavLink, Outlet } from 'react-router-dom'

import { BrandLink } from '@/components/BrandLink'
import { NotificationMenu } from '@/components/NotificationMenu'
import { SkipToContent } from '@/components/SkipToContent'
import { navLinkClass, shellInnerRow } from '@/lib/layout'
import { cn } from '@/lib/utils'

export function AdminLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <SkipToContent />
      <header className="border-b py-3">
        <div
          className={cn(
            shellInnerRow,
            'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
          )}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <BrandLink />
            <span className="text-sm text-muted-foreground">Admin</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <NotificationMenu />
            <NavLink to="/admin/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/admin/students" className={navLinkClass}>
              Students
            </NavLink>
            <NavLink to="/admin/courses" className={navLinkClass}>
              Courses
            </NavLink>
            <NavLink to="/admin/enrollments" className={navLinkClass}>
              Enrollments
            </NavLink>
            <NavLink to="/admin/reports" className={navLinkClass}>
              Reports
            </NavLink>
            <NavLink to="/admin/admins" className={navLinkClass}>
              Admins
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="main-content" className="flex flex-1 flex-col" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
