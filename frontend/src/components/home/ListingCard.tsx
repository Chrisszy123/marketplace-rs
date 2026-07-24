import { formatPrice } from '../../lib/format'
import { BoostedBadge } from './BoostedBadge'

interface ListingCardProps {
  title: string
  priceKobo: number
  currency: string
  location: string
  boosted?: boolean
}

export function ListingCard({ title, priceKobo, currency, location, boosted }: ListingCardProps) {
  return (
    <div
      className={`w-full max-w-xs rounded-2xl bg-white p-3 shadow-sm transition ${
        boosted ? 'ring-2 ring-brand-boosted' : ''
      }`}
    >
      <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-lg bg-brand-bg">
        <svg
          viewBox="0 0 24 24"
          className="absolute inset-0 m-auto h-8 w-8 text-brand-dark-green/20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="10" r="1.5" />
          <path d="M21 16l-5-5-4 4-2-2-5 5" />
        </svg>
        {boosted && <span className="absolute left-2 top-2"><BoostedBadge /></span>}
      </div>
      <p className="truncate text-sm font-medium text-brand-dark">{title}</p>
      <p className="text-sm font-semibold text-brand-green">{formatPrice(priceKobo, currency)}</p>
      <p className="truncate text-xs text-brand-dark/60">{location}</p>
      {boosted && (
        <p className="mt-2 text-[11px] font-medium text-brand-dark-green">
          Featured seller · Top of search
        </p>
      )}
    </div>
  )
}
