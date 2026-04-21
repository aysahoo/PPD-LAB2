import { useState } from 'react'
import { BrandLink } from '@/components/BrandLink'
import { Link, NavLink } from 'react-router-dom'
import { Menu, UserRound } from 'lucide-react'

import { NotificationMenu } from '@/components/NotificationMenu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { navLinkClass, shellInnerRow } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'

function PrimaryNav({
  onNavigate,
  className,
  showAccountLink,
  renderAuthLinks = false,
}: {
  onNavigate?: () => void
  className?: string
  /** Text link in slide-out menu (desktop uses header profile icon instead) */
  showAccountLink?: boolean
  /** Guest Sign in / Register — desktop uses header end; mobile menu passes true */
  renderAuthLinks?: boolean
}) {
  const { user, loading } = useAuth()

  return (
    <nav
      className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', className)}
      aria-label="Primary"
    >
      <NavLink to="/" end className={navLinkClass} onClick={onNavigate}>
        Home
      </NavLink>
      <NavLink to="/courses" className={navLinkClass} onClick={onNavigate}>
        Courses
      </NavLink>
      {!loading && user?.role === 'student' ? (
        <NavLink to="/enrollments" className={navLinkClass} onClick={onNavigate}>
          My enrollments
        </NavLink>
      ) : null}
      {!loading && user && showAccountLink ? (
        <NavLink to="/account" className={navLinkClass} onClick={onNavigate}>
          Account
        </NavLink>
      ) : null}
      {!loading && user?.role === 'admin' ? (
        <NavLink to="/admin/dashboard" className={navLinkClass} onClick={onNavigate}>
          Admin
        </NavLink>
      ) : null}
      {renderAuthLinks && !loading && !user ? (
        <>
          <NavLink to="/login" className={navLinkClass} onClick={onNavigate}>
            Sign in
          </NavLink>
          <NavLink to="/register" className={navLinkClass} onClick={onNavigate}>
            Register
          </NavLink>
        </>
      ) : null}
    </nav>
  )
}

export function SiteHeader() {
  const { user, loading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 py-3 backdrop-blur-md supports-backdrop-filter:bg-background/70">
      <div
        className={cn(
          shellInnerRow,
          'flex flex-row flex-wrap items-center justify-between gap-3',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-x-4 gap-y-2">
          <BrandLink onNavigate={() => setMobileOpen(false)} />
          <PrimaryNav className="hidden md:flex" />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!loading && !user ? (
            <nav
              className="hidden items-center gap-x-4 gap-y-2 md:flex"
              aria-label="Authentication"
            >
              <NavLink
                to="/login"
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </NavLink>
              <NavLink
                to="/register"
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                Register
              </NavLink>
            </nav>
          ) : null}
          {user ? (
            <>
              <NotificationMenu />
              <Link
                to="/account"
                onClick={() => setMobileOpen(false)}
                className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }), 'shrink-0')}
                aria-label="Account"
              >
                <UserRound className="size-4" aria-hidden />
              </Link>
            </>
          ) : null}

          <div className="md:hidden">
            <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav-dialog"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="size-4" aria-hidden />
              </Button>
              <DialogContent
                id="mobile-nav-dialog"
                className="top-[8%] max-h-[80vh] translate-y-0 overflow-y-auto sm:max-w-sm"
                showCloseButton
              >
                <DialogHeader>
                  <DialogTitle className="text-left">Menu</DialogTitle>
                </DialogHeader>
                <PrimaryNav
                  showAccountLink
                  renderAuthLinks
                  className="flex-col items-stretch gap-1 pt-2 [&_a]:rounded-md [&_a]:px-2 [&_a]:py-2.5"
                  onNavigate={() => setMobileOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </header>
  )
}
