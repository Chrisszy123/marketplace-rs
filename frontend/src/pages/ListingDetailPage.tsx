import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiRequestError } from '../api/client'
import type { Listing } from '../api/types'

function formatPrice(kobo: number, currency: string) {
  return `${currency === 'NGN' ? '₦' : currency} ${(kobo / 100).toLocaleString()}`
}

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api
      .getListing(id)
      .then(setListing)
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load listing'))
  }, [id])

  if (error) {
    return <p className="p-8 text-center text-red-600">{error}</p>
  }
  if (!listing) {
    return <p className="p-8 text-center text-brand-dark">Loading…</p>
  }

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm">
        {listing.status === 'expired' && (
          <p className="mb-4 rounded-lg bg-brand-dark/10 px-3 py-2 text-sm text-brand-dark/70">
            This listing has expired and is no longer bookable.
          </p>
        )}

        {listing.photos.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {listing.photos.map((photo) => (
              <img
                key={photo.id}
                src={photo.url}
                alt=""
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        <div className="mb-2 flex items-center gap-2">
          {listing.is_boosted && (
            <span className="rounded-full bg-brand-boosted px-2 py-0.5 text-xs font-semibold text-brand-dark-green">
              Top Ad
            </span>
          )}
          <span className="text-xs uppercase tracking-wide text-brand-dark/50">
            {listing.listing_type === 'good' ? 'For sale' : 'Service'}
          </span>
        </div>

        <h1 className="mb-1 text-2xl font-semibold text-brand-dark-green">{listing.title}</h1>
        <p className="mb-4 text-xl font-medium text-brand-green">
          {formatPrice(listing.price_kobo, listing.currency)}
        </p>

        <p className="mb-4 whitespace-pre-wrap text-brand-dark">{listing.description}</p>

        <dl className="space-y-1 text-sm text-brand-dark/70">
          <div className="flex justify-between">
            <dt>Location</dt>
            <dd>{listing.location}</dd>
          </div>
          {listing.condition && (
            <div className="flex justify-between">
              <dt>Condition</dt>
              <dd className="capitalize">{listing.condition}</dd>
            </div>
          )}
          {listing.service_area && (
            <div className="flex justify-between">
              <dt>Service area</dt>
              <dd>{listing.service_area}</dd>
            </div>
          )}
        </dl>
      </div>
    </main>
  )
}
