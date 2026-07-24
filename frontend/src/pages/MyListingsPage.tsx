import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiRequestError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Listing } from '../api/types'

const STATUS_STYLES: Record<Listing['status'], string> = {
  active: 'bg-brand-green/10 text-brand-green',
  expiring: 'bg-brand-boosted/40 text-brand-dark-green',
  expired: 'bg-brand-dark/10 text-brand-dark/70',
  sold: 'bg-brand-dark/10 text-brand-dark/70',
  paused: 'bg-brand-dark/10 text-brand-dark/70',
}

function formatPrice(kobo: number, currency: string) {
  return `${currency === 'NGN' ? '₦' : currency} ${(kobo / 100).toLocaleString()}`
}

export function MyListingsPage() {
  const { accessToken } = useAuth()
  const [listings, setListings] = useState<Listing[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function loadPage(afterCursor?: string) {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.getMyListings(
        { cursor: afterCursor, limit: 20 },
        accessToken as string,
      )
      setListings((prev) => (afterCursor ? [...prev, ...res.items] : res.items))
      setCursor(res.next_cursor)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to load your listings')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRenew(id: string) {
    setActionError(null)
    try {
      const renewed = await api.renewListing(id, accessToken as string)
      setListings((prev) => prev.map((l) => (l.id === id ? renewed : l)))
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : 'Failed to renew listing')
    }
  }

  async function handleDelete(id: string) {
    setActionError(null)
    try {
      await api.deleteListing(id, accessToken as string)
      setListings((prev) => prev.filter((l) => l.id !== id))
    } catch (err) {
      setActionError(err instanceof ApiRequestError ? err.message : 'Failed to delete listing')
    }
  }

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-brand-dark-green">My listings</h1>
          <Link
            to="/listings/new"
            className="rounded-full bg-brand-green px-4 py-2 text-sm font-medium text-white"
          >
            + New listing
          </Link>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {actionError && <p className="mb-4 text-sm text-red-600">{actionError}</p>}

        {!isLoading && listings.length === 0 && !error && (
          <p className="text-brand-dark/70">You haven’t posted any listings yet.</p>
        )}

        <ul className="space-y-3">
          {listings.map((listing) => (
            <li key={listing.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link to={`/listings/${listing.id}`} className="font-medium text-brand-dark-green">
                    {listing.title}
                  </Link>
                  <p className="text-sm text-brand-dark/70">
                    {formatPrice(listing.price_kobo, listing.currency)} · {listing.location}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[listing.status]}`}
                >
                  {listing.status}
                </span>
              </div>
              <div className="mt-3 flex gap-2 text-sm">
                <Link
                  to={`/listings/${listing.id}/edit`}
                  className="rounded-full border border-brand-dark/20 px-3 py-1"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleRenew(listing.id)}
                  className="rounded-full border border-brand-dark/20 px-3 py-1"
                >
                  Renew
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(listing.id)}
                  className="rounded-full border border-red-200 px-3 py-1 text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        {cursor && (
          <button
            type="button"
            onClick={() => loadPage(cursor)}
            disabled={isLoading}
            className="mt-6 w-full rounded-full border border-brand-dark/20 py-2 text-sm font-medium disabled:opacity-60"
          >
            {isLoading ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </main>
  )
}
