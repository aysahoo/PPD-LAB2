import { Anchor, Text } from '@mantine/core'
import { Link } from 'react-router-dom'

type BrandLinkProps = {
  onNavigate?: () => void
}

export function BrandLink({ onNavigate }: BrandLinkProps) {
  return (
    <Anchor component={Link} to="/" onClick={onNavigate} underline="never">
      <Text size="sm" fw={600} style={{ letterSpacing: '-0.02em' }}>
        PPD Lab
      </Text>
    </Anchor>
  )
}
