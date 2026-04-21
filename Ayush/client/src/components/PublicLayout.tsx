import { Outlet } from 'react-router-dom'

import { SiteHeader } from '@/components/SiteHeader'
import { SkipToContent } from '@/components/SkipToContent'

export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <SkipToContent />
      <SiteHeader />
      <main id="main-content" className="flex flex-1 flex-col" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
