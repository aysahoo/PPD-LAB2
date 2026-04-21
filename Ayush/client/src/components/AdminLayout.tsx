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
      <header className="sticky top-0 z-50 border-b bg-background/85 py-3 backdrop-blur-md supports-backdrop-filter:bg-background/70">
        <div
          className={cn(
            shellInnerRow,
            'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
          )}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <BrandLink />
            <span className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Admin
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-5">
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
      <main
        id="main-content"
        className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/25 dark:bg-muted/10"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  )
}
