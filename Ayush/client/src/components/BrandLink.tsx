import { Link } from 'react-router-dom'

type BrandLinkProps = {
  onNavigate?: () => void
}

export function BrandLink({ onNavigate }: BrandLinkProps) {
  return (
    <Link
      to="/"
      className="shrink-0 text-sm font-semibold tracking-tight"
      onClick={onNavigate}
    >
      PPD Lab
    </Link>
  )
}
