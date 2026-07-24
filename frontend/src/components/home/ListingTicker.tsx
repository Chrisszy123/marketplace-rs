import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { SearchHit } from '../../api/types'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { ListingChip } from './ListingChip'

export function ListingTicker() {
  const [items, setItems] = useState<SearchHit[] | null>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    api
      .search({ sort: 'date', limit: 12 })
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
  }, [])

  if (!items || items.length === 0) return null

  if (prefersReducedMotion) {
    return (
      <div className="border-t border-white/10 bg-brand-dark-green py-6">
        <p className="mx-auto mb-3 max-w-6xl px-4 text-xs font-medium uppercase tracking-wide text-white/50">
          Just listed on Marketplace
        </p>
        <div className="flex gap-3 overflow-x-auto px-4 pb-2" role="list" aria-label="Recently listed items">
          {items.map((item) => (
            <div key={item.id} role="listitem">
              <ListingChip item={item} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const track = [...items, ...items]

  return (
    <div className="overflow-hidden border-t border-white/10 bg-brand-dark-green py-6">
      <p className="mx-auto mb-3 max-w-6xl px-4 text-xs font-medium uppercase tracking-wide text-white/50">
        Just listed on Marketplace
      </p>
      <div
        className="animate-marquee flex w-max gap-3 px-4"
        role="list"
        aria-label="Recently listed items"
      >
        {track.map((item, index) => (
          <div key={`${item.id}-${index}`} role="listitem" aria-hidden={index >= items.length}>
            <ListingChip item={item} />
          </div>
        ))}
      </div>
    </div>
  )
}
