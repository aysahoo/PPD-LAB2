import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export type BreadcrumbItem = { label: string; to?: string }

type BreadcrumbsProps = {
  items: BreadcrumbItem[]
}

/** NN/g pattern: show hierarchy on deeper views (catalog → course, etc.) */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? (
              <ChevronRight className="size-3.5 shrink-0 opacity-50" aria-hidden />
            ) : null}
            {item.to ? (
              <Link
                to={item.to}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
