import { ChevronRight } from 'lucide-react'
import { Anchor, Group, Text } from '@mantine/core'
import { Link } from 'react-router-dom'

export type BreadcrumbItem = { label: string; to?: string }

type BreadcrumbsProps = {
  items: BreadcrumbItem[]
}

/** NN/g pattern: show hierarchy on deeper views (catalog → course, etc.) */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb">
      <Group gap={6} wrap="wrap">
        {items.map((item, i) => (
          <Group key={`${item.label}-${i}`} gap={6} wrap="nowrap">
            {i > 0 ? <ChevronRight size={14} style={{ opacity: 0.5 }} aria-hidden /> : null}
            {item.to ? (
              <Anchor component={Link} to={item.to} size="sm" c="dimmed" underline="hover">
                {item.label}
              </Anchor>
            ) : (
              <Text size="sm" fw={500} aria-current="page">
                {item.label}
              </Text>
            )}
          </Group>
        ))}
      </Group>
    </nav>
  )
}
