import { pageH1, pageLead } from '@/lib/layout'
import { cn } from '@/lib/utils'

type PageHeadingProps = {
  title: string
  description?: string
  className?: string
}

/** Standard page title + optional lead (matches admin + public list pages) */
export function PageHeading({ title, description, className }: PageHeadingProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <h1 className={pageH1}>{title}</h1>
      {description ? <p className={pageLead}>{description}</p> : null}
    </div>
  )
}
