import { Outlet } from 'react-router-dom'

import { SiteHeader } from '@/components/SiteHeader'
import { SkipToContent } from '@/components/SkipToContent'

export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <SkipToContent />
      <SiteHeader />
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
