import { EmptyState } from '../ui/EmptyState'
import { ListingCard } from '../ui/ListingCard'
import type { SearchHit } from '../../api/types'

interface ListingGridProps {
  items: SearchHit[]
  isLoading: boolean
  error: string | null
  emptyAction?: { label: string; onClick: () => void }
  sentinelRef?: React.RefObject<HTMLDivElement | null>
}

export function ListingGrid({ items, isLoading, error, emptyAction, sentinelRef }: ListingGridProps) {
  if (error) {
    return <p className="text-body-sm text-brand-error">{error}</p>
  }

  if (!isLoading && items.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet."
        body="Try a different keyword, widen the location, or clear your filters."
        action={emptyAction}
      />
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <ListingCard
            key={item.id}
            variant="grid"
            listing={{
              id: item.id,
              title: item.title,
              priceKobo: item.price_kobo,
              currency: item.currency,
              location: item.location,
              thumbnailUrl: item.thumbnail_url,
              isBoosted: item.is_boosted,
            }}
          />
        ))}
      </div>
      {sentinelRef && <div ref={sentinelRef} className="h-4" />}
      {isLoading && <p className="py-6 text-center text-body-sm text-brand-dark/55">Loading…</p>}
    </div>
  )
}
