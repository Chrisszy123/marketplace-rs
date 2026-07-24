import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiRequestError } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../context/AuthContext'
import { useAuthPrompt } from '../context/AuthPromptContext'
import { getViewerId } from '../lib/deviceId'
import { formatPrice } from '../lib/format'
import { loadFavoriteIds, toggleFavorite } from '../lib/favorites'
import { recordView } from '../lib/recentlyViewed'
import type { Listing } from '../api/types'

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { requireAuth } = useAuthPrompt()
  const navigate = useNavigate()
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .getListing(id)
      .then(setListing)
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load listing'))
  }, [id])

  useEffect(() => {
    if (!id) return
    const viewerId = getViewerId(user?.id)
    recordView(viewerId, id)
    setIsFavorited(loadFavoriteIds(viewerId).includes(id))
  }, [user, id])

  function handleToggleFavorite() {
    if (!id) return
    const next = toggleFavorite(getViewerId(user?.id), id)
    setIsFavorited(next.includes(id))
  }

  function handleMessageSeller() {
    if (!listing) return
    requireAuth(() => navigate(`/messages/${listing.id}?with=${listing.seller_id}`))
  }

  if (error) {
    return <p className="p-8 text-center text-brand-error">{error}</p>
  }
  if (!listing) {
    return <p className="p-8 text-center text-brand-dark">Loading…</p>
  }

  const isOwnListing = user?.id === listing.seller_id

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-3xl bg-white shadow-card">
          {listing.status === 'expired' && (
            <p className="bg-brand-dark/5 px-6 py-3 text-body-sm text-brand-dark/70">
              This listing has expired and is no longer bookable.
            </p>
          )}
          {listing.status === 'sold' && (
            <p className="bg-brand-forest px-6 py-3 text-body-sm font-medium text-white">
              This item has been marked as sold.
            </p>
          )}

          {listing.photos.length > 0 ? (
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {listing.photos.map((photo, index) => (
                <img
                  key={photo.id}
                  src={photo.url}
                  alt=""
                  className={`aspect-square w-full object-cover ${index === 0 ? 'col-span-2 row-span-2 sm:col-span-2 sm:row-span-2' : ''}`}
                />
              ))}
            </div>
          ) : (
            <div className="flex aspect-[16/9] items-center justify-center bg-brand-bg text-brand-dark-green/15">
              <svg viewBox="0 0 24 24" className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10" r="1.5" />
                <path d="M21 16l-5-5-4 4-2-2-5 5" />
              </svg>
            </div>
          )}

          <div className="p-6 sm:p-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {listing.status === 'sold' && <Badge variant="sold" />}
              {listing.status === 'expiring' && <Badge variant="expiring" />}
              {listing.is_boosted && listing.status !== 'sold' && <Badge variant="boosted" />}
              <span className="text-label text-brand-dark/45">
                {listing.listing_type === 'good' ? 'For sale' : 'Service'}
              </span>
            </div>

            <div className="mb-1 flex items-start justify-between gap-3">
              <h1 className="text-h1 text-brand-dark-green">{listing.title}</h1>
              {!isOwnListing && (
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  aria-label={isFavorited ? 'Remove from saved' : 'Save listing'}
                  aria-pressed={isFavorited}
                  className="shrink-0 rounded-full p-2 text-brand-dark/40 outline-none transition hover:bg-brand-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill={isFavorited ? '#4CB311' : 'none'}
                    stroke={isFavorited ? '#4CB311' : 'currentColor'}
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 20.5s-7.5-4.6-9.8-9.1C.6 8 2 4.5 5.6 4c2-.3 3.7.6 4.9 2.3 1.2-1.7 2.9-2.6 4.9-2.3C18.9 4.5 20.4 8 18.7 11.4 16.5 15.9 12 20.5 12 20.5z"
                    />
                  </svg>
                </button>
              )}
            </div>
            <p
              className={`mb-4 text-h2 font-semibold ${listing.status === 'sold' ? 'text-brand-dark/40 line-through' : 'text-brand-green'}`}
            >
              {formatPrice(listing.price_kobo, listing.currency)}
            </p>

            <p className="mb-6 whitespace-pre-wrap text-body text-brand-dark">{listing.description}</p>

            <dl className="mb-6 space-y-1.5 text-body-sm text-brand-dark/70">
              <div className="flex justify-between">
                <dt>Location</dt>
                <dd className="font-medium text-brand-dark">{listing.location}</dd>
              </div>
              {listing.condition && (
                <div className="flex justify-between">
                  <dt>Condition</dt>
                  <dd className="font-medium capitalize text-brand-dark">{listing.condition}</dd>
                </div>
              )}
              {listing.service_area && (
                <div className="flex justify-between">
                  <dt>Service area</dt>
                  <dd className="font-medium text-brand-dark">{listing.service_area}</dd>
                </div>
              )}
            </dl>

            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-brand-bg p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-dark-green">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
                </svg>
              </div>
              <div>
                <p className="text-body-sm font-semibold text-brand-dark">Seller on Marketplace</p>
                <p className="text-caption text-brand-dark/55">Deal directly — meet safely, inspect before you pay.</p>
              </div>
            </div>

            {!isOwnListing && listing.status !== 'sold' && (
              <button
                type="button"
                onClick={handleMessageSeller}
                className="block w-full rounded-full bg-brand-green py-3 text-center text-body font-semibold text-white outline-none transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
              >
                Message seller
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
