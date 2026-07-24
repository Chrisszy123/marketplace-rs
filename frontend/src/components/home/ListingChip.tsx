import { formatPrice } from '../../lib/format'
import { BoostedBadge } from './BoostedBadge'
import type { SearchHit } from '../../api/types'

export function ListingChip({ item }: { item: SearchHit }) {
  return (
    <div className="flex w-64 shrink-0 items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-sm">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-bg">
        {item.thumbnail_url && (
          <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-brand-dark">{item.title}</p>
        <p className="truncate text-xs text-brand-dark/60">{item.location}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className="text-sm font-semibold text-brand-green">
          {formatPrice(item.price_kobo, item.currency)}
        </p>
        {item.is_boosted && <BoostedBadge />}
      </div>
    </div>
  )
}
