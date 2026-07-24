import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiRequestError } from '../../api/client'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import { ListingCard } from '../ui/ListingCard'
import { useAuth } from '../../context/AuthContext'
import { useSellSheet } from '../../context/SellSheetContext'
import { deleteDraft, loadDrafts, type ListingDraft } from '../../lib/drafts'
import { formatPrice } from '../../lib/format'
import type { Listing, ListingStatus } from '../../api/types'

const NEUTRAL_STATUS_STYLES: Partial<Record<ListingStatus, string>> = {
  active: 'bg-brand-green/10 text-brand-green',
  paused: 'bg-brand-dark/8 text-brand-dark/60',
  expired: 'bg-brand-dark/8 text-brand-dark/45',
}

function StatusPill({ status }: { status: ListingStatus }) {
  if (status === 'sold') return <Badge variant="sold" />
  if (status === 'expiring') return <Badge variant="expiring" />
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${NEUTRAL_STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}

export function SellingTab() {
  const { user, accessToken } = useAuth()
  const { openSell } = useSellSheet()
  const [listings, setListings] = useState<Listing[]>([])
  const [drafts, setDrafts] = useState<ListingDraft[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function loadPage(afterCursor?: string) {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.getMyListings({ cursor: afterCursor, limit: 20 }, accessToken as string)
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
    if (user) setDrafts(loadDrafts(user.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleDiscardDraft(id: string) {
    if (!user) return
    deleteDraft(user.id, id)
    setDrafts(loadDrafts(user.id))
  }

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
    <div>
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-card">
        <div className="mb-1 flex items-center gap-2">
          <p className="text-h3 text-brand-dark-green">Marketplace Pro</p>
          <span className="rounded-full bg-brand-dark/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-dark/50">
            Coming soon
          </span>
        </div>
        <p className="mb-4 text-body-sm text-brand-dark/65">
          Top-of-search placement, a featured badge, unlimited active listings, and auto-renewal.
          Billing isn't live yet — this is a preview of what's coming.
        </p>
        <button
          type="button"
          disabled
          className="rounded-full bg-brand-dark/10 px-5 py-2 text-body-sm font-semibold text-brand-dark/40"
        >
          Upgrade
        </button>
      </div>

      {drafts.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-label text-brand-dark/45">Drafts</p>
          <ul className="space-y-2">
            {drafts.map((draft) => (
              <li
                key={draft.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-brand-dark/20 bg-white/60 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold text-brand-dark">
                    {draft.title || 'Untitled listing'}
                  </p>
                  <p className="text-caption text-brand-dark/50">
                    {draft.priceNaira ? formatPrice(Number(draft.priceNaira) * 100, 'NGN') : 'No price yet'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 text-caption font-semibold">
                  <button type="button" onClick={() => openSell(draft.id)} className="text-brand-green">
                    Resume
                  </button>
                  <button type="button" onClick={() => handleDiscardDraft(draft.id)} className="text-brand-error">
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <p className="text-label text-brand-dark/45">Your listings</p>
        <button type="button" onClick={() => openSell()} className="text-body-sm font-semibold text-brand-green">
          + New listing
        </button>
      </div>

      {error && <p className="mb-4 text-body-sm text-brand-error">{error}</p>}
      {actionError && <p className="mb-4 text-body-sm text-brand-error">{actionError}</p>}

      {!isLoading && listings.length === 0 && !error && (
        <EmptyState
          title="You haven't posted anything yet."
          body="List something in a couple of minutes — photos, a price, and a location is all it takes."
          action={{ label: 'Sell something', onClick: () => openSell() }}
        />
      )}

      <ul className="space-y-3">
        {listings.map((listing) => (
          <li key={listing.id} className="space-y-2">
            <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
              <div className="flex-1">
                <ListingCard
                  variant="row"
                  className="!shadow-none !p-0"
                  listing={{
                    id: listing.id,
                    title: listing.title,
                    priceKobo: listing.price_kobo,
                    currency: listing.currency,
                    location: listing.location,
                    thumbnailUrl: listing.photos[0]?.url ?? null,
                    isBoosted: listing.is_boosted,
                  }}
                />
              </div>
              <StatusPill status={listing.status} />
            </div>
            <div className="flex gap-3 pl-1 text-caption font-semibold">
              <Link to={`/listings/${listing.id}/edit`} className="text-brand-dark/60 hover:text-brand-dark">
                Edit
              </Link>
              <button type="button" onClick={() => handleRenew(listing.id)} className="text-brand-dark/60 hover:text-brand-dark">
                Renew
              </button>
              <button type="button" onClick={() => handleDelete(listing.id)} className="text-brand-error">
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
          className="mt-6 w-full rounded-full border border-brand-dark/15 py-2.5 text-body-sm font-semibold text-brand-dark outline-none disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
        >
          {isLoading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
