import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { EmptyState } from '../ui/EmptyState'
import { ListingCard } from '../ui/ListingCard'
import { useAuth } from '../../context/AuthContext'
import { loadFavoriteIds } from '../../lib/favorites'
import { loadRecentlyViewed } from '../../lib/recentlyViewed'
import type { Listing, ThreadSummary } from '../../api/types'

async function fetchListings(ids: string[]): Promise<Listing[]> {
  const results = await Promise.all(
    ids.map((id) =>
      api
        .getListing(id)
        .then((listing) => listing)
        .catch(() => null),
    ),
  )
  return results.filter((l): l is Listing => l !== null)
}

export function BuyingTab() {
  const { accessToken, user } = useAuth()
  const [saved, setSaved] = useState<Listing[] | null>(null)
  const [recentlyViewed, setRecentlyViewed] = useState<Listing[] | null>(null)
  const [threads, setThreads] = useState<ThreadSummary[]>([])

  const loadSaved = useCallback(() => {
    if (!user) return
    fetchListings(loadFavoriteIds(user.id)).then(setSaved)
  }, [user])

  useEffect(() => {
    loadSaved()
  }, [loadSaved])

  useEffect(() => {
    if (!user) return
    fetchListings(loadRecentlyViewed(user.id)).then(setRecentlyViewed)
  }, [user])

  useEffect(() => {
    if (!accessToken) return
    api
      .getThreads({ limit: 3 }, accessToken)
      .then((res) => setThreads(res.items))
      .catch(() => setThreads([]))
  }, [accessToken])

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-label text-brand-dark/45">Saved</p>
        {saved && saved.length === 0 ? (
          <EmptyState
            title="Nothing saved yet."
            body="Tap the heart on a listing to keep track of it here."
            action={{ label: 'Browse listings', to: '/search' }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {saved?.map((listing) => (
              <ListingCard
                key={listing.id}
                variant="grid"
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
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-label text-brand-dark/45">Conversations</p>
          <Link to="/messages" className="text-body-sm font-semibold text-brand-green">
            See all
          </Link>
        </div>
        {threads.length === 0 ? (
          <p className="text-body-sm text-brand-dark/55">No conversations yet.</p>
        ) : (
          <ul className="space-y-2">
            {threads.map((t) => (
              <li key={`${t.listing_id}:${t.counterpart_id}`}>
                <Link
                  to={`/listings/${t.listing_id}/chat?with=${t.counterpart_id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3.5 shadow-card"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-brand-dark">{t.counterpart_name}</p>
                    <p className="truncate text-caption text-brand-dark/55">{t.listing_title}</p>
                  </div>
                  {t.unread_count > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-green px-1.5 text-[11px] font-semibold text-white">
                      {t.unread_count}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {recentlyViewed && recentlyViewed.length > 0 && (
        <div>
          <p className="mb-3 text-label text-brand-dark/45">Recently viewed</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recentlyViewed.map((listing) => (
              <ListingCard
                key={listing.id}
                variant="grid"
                className="w-36 shrink-0"
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
