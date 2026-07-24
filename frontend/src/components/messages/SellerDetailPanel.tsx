import { useEffect, useState } from 'react'
import { api, ApiRequestError } from '../../api/client'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { CloseIcon, PhoneIcon } from '../ui/icons'
import { ListingCard } from '../ui/ListingCard'
import type { Listing, SellerProfile } from '../../api/types'

function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
}

interface SellerDetailPanelProps {
  sellerId: string
  sellerProfile: SellerProfile | null
  isLoadingProfile: boolean
  profileError: string | null
  onClose: () => void
}

export function SellerDetailPanel({
  sellerId,
  sellerProfile,
  isLoadingProfile,
  profileError,
  onClose,
}: SellerDetailPanelProps) {
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoadingListings, setIsLoadingListings] = useState(true)
  const [listingsError, setListingsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoadingListings(true)
    setListingsError(null)
    api
      .getSellerListings(sellerId, 5)
      .then((res) => {
        if (!cancelled) setListings(res.items)
      })
      .catch((err) => {
        if (!cancelled) {
          setListingsError(err instanceof ApiRequestError ? err.message : 'Failed to load shop items')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingListings(false)
      })
    return () => {
      cancelled = true
    }
  }, [sellerId])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="animate-fade-in absolute inset-0 bg-brand-dark-green/40" onClick={onClose} />
      <div className="animate-sheet-right relative flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white shadow-sheet">
        <div className="sticky top-0 flex items-center gap-2 border-b border-brand-dark/10 bg-white px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close seller details"
            className="flex h-9 w-9 items-center justify-center rounded-full text-brand-dark/60 outline-none transition hover:bg-brand-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
          <p className="text-h3 text-brand-dark-green">Seller details</p>
        </div>

        {isLoadingProfile && <p className="p-6 text-center text-body-sm text-brand-dark/55">Loading…</p>}
        {profileError && <p className="p-6 text-center text-body-sm text-brand-error">{profileError}</p>}

        {sellerProfile && (
          <>
            <div className="flex flex-col items-center gap-2 border-b border-brand-dark/10 px-6 py-7 text-center">
              <Avatar name={sellerProfile.display_name} url={sellerProfile.avatar_url} size="lg" />
              <p className="mt-1 text-h2 text-brand-dark-green">{sellerProfile.display_name}</p>
              {sellerProfile.phone_verified && <Badge variant="verified">Verified seller</Badge>}
              {sellerProfile.location && (
                <p className="text-body-sm text-brand-dark/60">{sellerProfile.location}</p>
              )}
              <p className="text-caption text-brand-dark/45">
                Member since {formatMemberSince(sellerProfile.member_since)}
              </p>
              <a
                href={`tel:${sellerProfile.phone_number}`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-green px-5 py-2 text-body-sm font-semibold text-white outline-none transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
              >
                <PhoneIcon className="h-4 w-4" />
                {sellerProfile.phone_number}
              </a>
            </div>

            <div className="flex-1 px-4 py-5">
              <p className="mb-3 text-label text-brand-dark/45">Top items in this shop</p>
              {isLoadingListings && (
                <p className="text-body-sm text-brand-dark/55">Loading items…</p>
              )}
              {listingsError && <p className="text-body-sm text-brand-error">{listingsError}</p>}
              {!isLoadingListings && !listingsError && listings.length === 0 && (
                <p className="text-body-sm text-brand-dark/55">No other active listings right now.</p>
              )}
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
          </>
        )}
      </div>
    </div>
  )
}
