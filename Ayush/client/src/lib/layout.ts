import { cn } from '@/lib/utils'

/** Page typography — use with PageHeading or match manually */
export const pageH1 = 'text-2xl font-semibold tracking-tight'
export const pageLead = 'text-sm text-muted-foreground'
export const sectionTitle = 'text-lg font-semibold tracking-tight'

/** Auth card width (login / register) */
export const authCardClass = 'w-full max-w-md'

/** Search fields and compact in-page forms */
export const maxWField = 'max-w-md'

/** Inner width for header and main content — keep in sync across shells */
export const SHELL_MAX = 'max-w-5xl'

/** Horizontal padding aligned with header edges */
export const shellPaddingX = 'px-4 sm:px-6 lg:px-8'

export const shellInnerRow = cn('mx-auto flex w-full', SHELL_MAX, shellPaddingX)

/** Vertical rhythm between breadcrumbs, title, and first content block */
export const pageIntroStack = 'space-y-4'

/** Default stack for list/detail/settings pages (public + admin) */
export const pageShell = cn(
  shellInnerRow,
  'flex w-full min-w-0 flex-1 flex-col gap-8 py-8 sm:py-10',
)

/** Narrow forms (account) */
export const pageShellNarrow = cn(
  'mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col gap-8 py-8 sm:py-10',
  shellPaddingX,
)

/** Centered auth / landing cards — vertical fill, horizontal alignment with shell */
export const pageShellCentered = cn(
  'mx-auto flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-6 py-10 sm:py-12',
  shellPaddingX,
)

/** Inline loading / empty states inside the main column */
export const pageLoadingCenter = cn(
  shellInnerRow,
  'flex min-h-[240px] flex-1 items-center justify-center py-10 text-muted-foreground',
)

/** Full-viewport loading before admin shell mounts (matches shell horizontal padding) */
export const fullScreenLoading = cn(
  'flex min-h-svh flex-col items-center justify-center text-muted-foreground',
  shellPaddingX,
)

export const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm transition-colors',
    isActive ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
  )
