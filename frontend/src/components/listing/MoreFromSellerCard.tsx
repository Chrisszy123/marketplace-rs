import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { ListingCard } from '../ui/ListingCard'
import type { Listing } from '../../api/types'

const PREVIEW_COUNT = 3

interface MoreFromSellerCardProps {
  sellerId: string
  excludeListingId: string
}

export function MoreFromSellerCard({ sellerId, excludeListingId }: MoreFromSellerCardProps) {
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .getSellerListings(sellerId, PREVIEW_COUNT + 1)
      .then((res) => {
        if (cancelled) return
        setListings(res.items.filter((l) => l.id !== excludeListingId).slice(0, PREVIEW_COUNT))
      })
      .catch(() => {
        // Non-critical widget — fail quiet and just don't show it.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sellerId, excludeListingId])

  if (isLoading || listings.length === 0) return null

  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <p className="mb-3 text-label text-brand-dark/45">More from this seller</p>
      <ul className="space-y-2">
        {listings.map((listing) => (
          <li key={listing.id}>
            <ListingCard
              variant="row"
              listing={{
                id: listing.id,
                title: listing.title,
                priceKobo: listing.price_kobo,
                currency: listing.currency,
                location: listing.location,
                thumbnailUrl: listing.photos[0]?.url ?? null,
                isBoosted: listing.is_boosted,
                status: listing.status,
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
