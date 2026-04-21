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
export const shellPaddingX = 'px-4 sm:px-6'

export const shellInnerRow = cn('mx-auto flex w-full', SHELL_MAX, shellPaddingX)

/** Default stack for list/detail/settings pages (public + admin) */
export const pageShell = cn(
  shellInnerRow,
  'flex flex-col gap-6 py-6',
)

/** Narrow forms (account) */
export const pageShellNarrow = cn(
  'mx-auto flex w-full max-w-lg flex-col gap-6 py-6',
  shellPaddingX,
)

/** Centered auth / landing cards — vertical fill, horizontal alignment with shell */
export const pageShellCentered = cn(
  'flex flex-1 flex-col items-center justify-center py-6',
  shellPaddingX,
)

/** Inline loading / empty states inside the main column */
export const pageLoadingCenter = cn(
  shellInnerRow,
  'flex min-h-[200px] flex-1 items-center justify-center py-6 text-muted-foreground',
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
