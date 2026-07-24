import type { ReactNode } from 'react'

export type BadgeVariant = 'boosted' | 'expiring' | 'sold' | 'verified' | 'error'

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  boosted: 'bg-brand-boosted text-brand-dark-green shadow-[0_2px_10px_-2px_rgba(229,221,124,0.85)]',
  expiring: 'bg-brand-warning/15 text-brand-warning',
  sold: 'bg-brand-forest text-white',
  verified: 'bg-brand-green/10 text-brand-green',
  error: 'bg-brand-error/10 text-brand-error',
}

const VARIANT_ICON: Record<BadgeVariant, string> = {
  boosted: '★',
  expiring: '',
  sold: '✓',
  verified: '✓',
  error: '!',
}

const VARIANT_LABEL: Record<BadgeVariant, string> = {
  boosted: 'Boosted',
  expiring: 'Expiring soon',
  sold: 'Sold',
  verified: 'Verified',
  error: 'Reported',
}

interface BadgeProps {
  variant: BadgeVariant
  children?: ReactNode
  className?: string
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  const icon = VARIANT_ICON[variant]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${VARIANT_STYLES[variant]} ${className}`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children ?? VARIANT_LABEL[variant]}</span>
    </span>
  )
}
