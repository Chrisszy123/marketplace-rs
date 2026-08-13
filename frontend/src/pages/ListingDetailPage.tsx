import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiRequestError } from '../api/client'
import { Badge } from '../components/ui/Badge'
import { ListingGrid } from '../components/browse/ListingGrid'
import { ListingBreadcrumb } from '../components/listing/ListingBreadcrumb'
import { ListingGallery } from '../components/listing/ListingGallery'
import { MoreFromSellerCard } from '../components/listing/MoreFromSellerCard'
import { SellerRatingCard } from '../components/listing/SellerRatingCard'
import { SellerTab } from '../components/listing/SellerTab'
import { ShowPhoneNumberButton } from '../components/listing/ShowPhoneNumberButton'
import { Avatar } from '../components/ui/Avatar'
import { LinkIcon, ShareIcon } from '../components/ui/icons'
import { useAuth } from '../context/AuthContext'
import { useAuthPrompt } from '../context/AuthPromptContext'
import { getViewerId } from '../lib/deviceId'
import { formatPrice } from '../lib/format'
import { loadFavoriteIds, toggleFavorite } from '../lib/favorites'
import { recordView } from '../lib/recentlyViewed'
import type { Category, Listing, SearchHit } from '../api/types'

const SIMILAR_LISTINGS_LIMIT = 5
type Tab = 'details' | 'seller'

function formatPostedDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function SaveButton({
  isFavorited,
  onToggle,
  className = '',
}: {
  isFavorited: boolean
  onToggle: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isFavorited ? 'Remove from saved' : 'Save listing'}
      aria-pressed={isFavorited}
      className={`flex items-center justify-center gap-2 rounded-full border border-brand-dark/15 py-3 text-body font-semibold text-brand-dark outline-none transition hover:bg-brand-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
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
      {isFavorited ? 'Saved' : 'Save'}
    </button>
  )
}

function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — nothing useful to do.
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // User cancelled the share sheet — not an error.
      }
    } else {
      handleCopy()
    }
  }

  return (
    <div className="flex items-center gap-4 text-body-sm font-medium text-brand-dark/60">
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 outline-none transition hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
        >
          <ShareIcon className="h-4 w-4" />
          Share
        </button>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 outline-none transition hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
      >
        <LinkIcon className="h-4 w-4" />
        {copied ? 'Link copied!' : 'Copy link'}
      </button>
    </div>
  )
}

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { requireAuth } = useAuthPrompt()
  const navigate = useNavigate()

  const [listing, setListing] = useState<Listing | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFavorited, setIsFavorited] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [tab, setTab] = useState<Tab>('details')
  const [similar, setSimilar] = useState<SearchHit[]>([])
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(true)

  useEffect(() => {
    if (!id) return
    api
      .getListing(id)
      .then(setListing)
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load listing'))
  }, [id])

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (!id) return
    const viewerId = getViewerId(user?.id)
    recordView(viewerId, id)
    setIsFavorited(loadFavoriteIds(viewerId).includes(id))
  }, [user, id])

  useEffect(() => {
    if (!listing) return
    let cancelled = false
    setIsLoadingSimilar(true)
    api
      .search({ category_id: listing.category_id, limit: SIMILAR_LISTINGS_LIMIT })
      .then((res) => {
        if (!cancelled) setSimilar(res.items.filter((item) => item.id !== listing.id).slice(0, 4))
      })
      .catch(() => {
        if (!cancelled) setSimilar([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSimilar(false)
      })
    return () => {
      cancelled = true
    }
  }, [listing])

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
  const canMessage = !isOwnListing && listing.status !== 'sold'
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <ListingBreadcrumb categories={categories} categoryId={listing.category_id} title={listing.title} />

      {listing.status === 'expired' && (
        <p className="mt-4 rounded-xl bg-brand-dark/5 px-4 py-3 text-body-sm text-brand-dark/70">
          This listing has expired and is no longer bookable.
        </p>
      )}
      {listing.status === 'sold' && (
        <p className="mt-4 rounded-xl bg-brand-forest px-4 py-3 text-body-sm font-medium text-white">
          This item has been marked as sold.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <div className="lg:w-[56%]">
          <ListingGallery photos={listing.photos} title={listing.title} />
        </div>

        <div className="lg:flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {listing.status === 'sold' && <Badge variant="sold" />}
            {listing.status === 'expiring' && <Badge variant="expiring" />}
            {listing.is_boosted && listing.status !== 'sold' && <Badge variant="boosted" />}
            <span className="text-label text-brand-dark/45">
              {listing.listing_type === 'good' ? 'For sale' : 'Service'}
            </span>
          </div>

          <h1 className="text-h1 text-brand-dark-green">{listing.title}</h1>

          <button
            type="button"
            onClick={() => setTab('seller')}
            className="-mx-1.5 mt-2 flex items-center gap-2 rounded-lg px-1.5 py-1 text-left outline-none transition hover:bg-brand-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
          >
            <Avatar name={listing.seller?.display_name ?? 'Seller'} url={listing.seller?.avatar_url} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-body-sm font-semibold text-brand-dark">
                {listing.seller?.display_name ?? 'Seller on Marketplace'}
              </span>
              <span className="flex items-center gap-1.5 text-caption text-brand-dark/50">
                <span aria-hidden="true" className="text-brand-boosted">★</span>
                No ratings yet
                <span className="text-brand-dark/30">·</span>
                <span className="underline">See reviews</span>
              </span>
            </span>
          </button>

          <p
            className={`mb-1 mt-4 text-h2 font-semibold ${listing.status === 'sold' ? 'text-brand-dark/40 line-through' : 'text-brand-green'}`}
          >
            {formatPrice(listing.price_kobo, listing.currency)}
          </p>

          {!isOwnListing && (
            <div className="mt-5 space-y-2.5">
              {canMessage && (
                <button
                  type="button"
                  onClick={handleMessageSeller}
                  className="block w-full rounded-full bg-brand-green py-3 text-center text-body font-semibold text-white outline-none transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
                >
                  Message seller
                </button>
              )}
              <div className={canMessage ? 'grid grid-cols-2 gap-2.5' : ''}>
                {canMessage && <ShowPhoneNumberButton sellerId={listing.seller_id} />}
                <SaveButton
                  isFavorited={isFavorited}
                  onToggle={handleToggleFavorite}
                  className={canMessage ? '' : 'w-full'}
                />
              </div>
            </div>
          )}

          <dl className="mt-6 space-y-1.5 text-body-sm text-brand-dark/70">
            <div className="flex justify-between border-t border-brand-dark/10 py-2">
              <dt>Location</dt>
              <dd className="font-medium text-brand-dark">{listing.location}</dd>
            </div>
            {listing.condition && (
              <div className="flex justify-between border-t border-brand-dark/10 py-2">
                <dt>Condition</dt>
                <dd className="font-medium capitalize text-brand-dark">{listing.condition}</dd>
              </div>
            )}
            {listing.service_area && (
              <div className="flex justify-between border-t border-brand-dark/10 py-2">
                <dt>Service area</dt>
                <dd className="font-medium text-brand-dark">{listing.service_area}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-b border-brand-dark/10 py-2">
              <dt>Posted</dt>
              <dd className="font-medium text-brand-dark">{formatPostedDate(listing.published_at)}</dd>
            </div>
          </dl>

          <div className="mt-4">
            <ShareRow url={pageUrl} title={listing.title} />
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
        <div className="lg:flex-1">
          <div className="mb-6 flex gap-1 rounded-full bg-white p-1 shadow-card">
            {(['details', 'seller'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 rounded-full py-2 text-body-sm font-semibold outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${
                  tab === t ? 'bg-brand-green text-white' : 'text-brand-dark/60'
                }`}
              >
                {t === 'details' ? 'Details' : 'Seller & Reviews'}
              </button>
            ))}
          </div>

          {tab === 'details' ? (
            <p className="whitespace-pre-wrap text-body text-brand-dark">{listing.description}</p>
          ) : listing.seller ? (
            <SellerTab seller={listing.seller} />
          ) : (
            <p className="text-body-sm text-brand-dark/55">Seller info unavailable.</p>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:w-72 lg:shrink-0">
          <SellerRatingCard rating={null} />
          <MoreFromSellerCard sellerId={listing.seller_id} excludeListingId={listing.id} />
        </div>
      </div>

      {(isLoadingSimilar || similar.length > 0) && (
        <div className="mt-12">
          <h2 className="mb-4 text-h2 text-brand-dark-green">Similar listings</h2>
          <ListingGrid items={similar} isLoading={isLoadingSimilar} error={null} />
        </div>
      )}
    </main>
  )
}
