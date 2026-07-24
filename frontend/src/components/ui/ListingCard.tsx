import { Link } from 'react-router-dom'
import { formatPrice } from '../../lib/format'
import { Badge } from './Badge'
import type { ListingStatus } from '../../api/types'

export type ListingCardVariant = 'grid' | 'row' | 'pinned'

export interface ListingCardData {
  id: string
  title: string
  priceKobo: number
  currency: string
  location?: string
  thumbnailUrl?: string | null
  isBoosted?: boolean
  status?: ListingStatus
  expiresInDays?: number | null
  /** Overrides the formatted price, e.g. "Negotiable" or "Contact for price". */
  priceLabel?: string
  sellerRating?: { rating: number } | null
}

interface ListingCardProps {
  listing: ListingCardData
  variant?: ListingCardVariant
  className?: string
}

function PhotoPlaceholder() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-full w-full text-brand-dark-green/15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 16l-5-5-4 4-2-2-5 5" />
    </svg>
  )
}

function SellerRatingChip({ rating }: { rating: number }) {
  return (
    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-brand-dark shadow-card">
      <span className="text-brand-boosted" aria-hidden="true">
        ★
      </span>
      {rating.toFixed(1)}
    </div>
  )
}

function StatusBadge({ listing }: { listing: ListingCardData }) {
  if (listing.status === 'sold') return <Badge variant="sold" />
  if (listing.status === 'expiring') return <Badge variant="expiring" />
  if (listing.isBoosted) return <Badge variant="boosted" />
  return null
}

function Thumbnail({ listing, className }: { listing: ListingCardData; className: string }) {
  const dimmed = listing.status === 'sold' || listing.status === 'expired'
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg bg-brand-bg p-[18%] ${dimmed ? 'opacity-55 grayscale-[0.4]' : ''} ${className}`}
    >
      {listing.thumbnailUrl ? (
        <img
          src={listing.thumbnailUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover p-0"
        />
      ) : (
        <PhotoPlaceholder />
      )}
    </div>
  )
}

export function ListingCard({ listing, variant = 'grid', className = '' }: ListingCardProps) {
  const sold = listing.status === 'sold'
  const to = `/listings/${listing.id}`

  if (variant === 'row') {
    return (
      <Link
        to={to}
        className={`group flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card outline-none transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${
          listing.isBoosted && !sold ? 'ring-2 ring-brand-boosted' : ''
        } ${className}`}
      >
        <Thumbnail listing={listing} className="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-semibold text-brand-dark">{listing.title}</p>
          <p
            className={`text-body-sm font-semibold ${sold ? 'text-brand-dark/40 line-through' : 'text-brand-green'}`}
          >
            {listing.priceLabel ?? formatPrice(listing.priceKobo, listing.currency)}
          </p>
          {listing.location && (
            <p className="truncate text-caption text-brand-dark/60">{listing.location}</p>
          )}
        </div>
        <div className="shrink-0">
          <StatusBadge listing={listing} />
        </div>
      </Link>
    )
  }

  if (variant === 'pinned') {
    return (
      <Link
        to={to}
        className="flex items-center gap-2.5 rounded-xl border border-brand-dark/10 bg-brand-cream px-2.5 py-2 outline-none transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
      >
        <Thumbnail
          listing={listing}
          className={`h-9 w-9 ${listing.isBoosted && !sold ? 'ring-2 ring-brand-boosted' : ''}`}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-caption font-semibold text-brand-dark">{listing.title}</p>
          <p className="text-[11px] text-brand-dark/60">
            {sold ? 'Sold' : listing.status === 'expired' ? 'Expired' : 'Still active'}
            {' · '}
            {formatPrice(listing.priceKobo, listing.currency)}
          </p>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={to}
      className={`group block overflow-hidden rounded-2xl bg-white p-3.5 shadow-card outline-none transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${
        listing.isBoosted && !sold ? 'ring-2 ring-brand-boosted' : ''
      } ${className}`}
    >
      <div className="relative mb-3 aspect-square w-full">
        <Thumbnail listing={listing} className="h-full w-full" />
        <div className="absolute left-2 top-2">
          <StatusBadge listing={listing} />
        </div>
        {listing.sellerRating && <SellerRatingChip rating={listing.sellerRating.rating} />}
      </div>
      <p className="truncate text-body font-semibold text-brand-dark">{listing.title}</p>
      <p
        className={`mt-0.5 text-h3 font-semibold ${sold ? 'text-brand-dark/40 line-through' : 'text-brand-green'}`}
      >
        {listing.priceLabel ?? formatPrice(listing.priceKobo, listing.currency)}
      </p>
      {listing.location && (
        <p className="mt-1 truncate text-body-sm text-brand-dark/60">{listing.location}</p>
      )}
      {listing.status === 'expiring' && listing.expiresInDays != null && (
        <p className="mt-1 text-caption font-semibold text-brand-warning">
          Expires in {listing.expiresInDays} {listing.expiresInDays === 1 ? 'day' : 'days'}
        </p>
      )}
    </Link>
  )
}
