import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { formatPrice } from '../../lib/format'
import { Badge } from '../ui/Badge'
import type { SearchHit } from '../../api/types'

const MAX_FEATURED = 8
const AUTO_ADVANCE_MS = 5500

export function FeaturedCarousel() {
  const [items, setItems] = useState<SearchHit[] | null>(null)
  const [hasBoosted, setHasBoosted] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    // Boosted listings always sort first server-side, so a plain page already leads with them —
    // no separate "featured" endpoint needed. Filtered client-side rather than assumed.
    api
      .search({ sort: 'date', limit: 20 })
      .then((res) => {
        const boosted = res.items.filter((item) => item.is_boosted)
        // No boosted listings yet in this environment — fall back to the newest listings so the
        // section still has something to show, framed honestly as "just listed" rather than
        // mislabeled as featured/boosted.
        setHasBoosted(boosted.length > 0)
        setItems((boosted.length > 0 ? boosted : res.items).slice(0, MAX_FEATURED))
      })
      .catch(() => setItems([]))
  }, [])

  // Auto-advance one full slide at a time; paused on hover/focus and skipped entirely under
  // reduced motion so nothing moves on its own without the visitor asking for it.
  useEffect(() => {
    if (!items || items.length < 2 || isPaused || prefersReducedMotion) return
    const timer = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % items.length)
    }, AUTO_ADVANCE_MS)
    return () => window.clearInterval(timer)
  }, [items, isPaused, prefersReducedMotion])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: activeIndex * el.clientWidth, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }, [activeIndex, prefersReducedMotion])

  // Swiping manually also moves the "current slide" pointer, so auto-advance and the arrows
  // continue from wherever the visitor left it instead of snapping back.
  function handleTrackScroll() {
    const el = trackRef.current
    if (!el || el.clientWidth === 0) return
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  function goTo(direction: 1 | -1) {
    if (!items) return
    setActiveIndex((i) => (i + direction + items.length) % items.length)
  }

  if (!items || items.length === 0) return null

  return (
    <section
      className="relative bg-brand-dark-green"
      aria-label="Featured listings"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="flex items-end justify-between px-4 pb-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <div>
          <p className="text-label text-brand-boosted">{hasBoosted ? 'Featured' : 'New'}</p>
          <h2 className="text-h2 text-white">
            {hasBoosted ? 'Boosted listings right now' : 'Just listed on Marketplace'}
          </h2>
        </div>
        {items.length > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => goTo(-1)}
              aria-label="Previous featured listing"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white outline-none transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-boosted"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => goTo(1)}
              aria-label="Next featured listing"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white outline-none transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-boosted"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div
        ref={trackRef}
        onScroll={handleTrackScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/listings/${item.id}`}
            className="group relative block h-72 w-full shrink-0 snap-center overflow-hidden outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-boosted sm:h-80 lg:h-[420px]"
          >
            {item.thumbnail_url ? (
              <img
                src={item.thumbnail_url}
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-brand-forest">
                <svg viewBox="0 0 24 24" className="h-20 w-20 text-white/10" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="8.5" cy="10" r="1.5" />
                  <path d="M21 16l-5-5-4 4-2-2-5 5" />
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-dark-green/95 via-brand-dark-green/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8">
              {item.is_boosted && <Badge variant="boosted" className="mb-2" />}
              <p className="text-h1 text-white">{item.title}</p>
              <p className="mt-1 text-h3 font-semibold text-brand-boosted">
                {formatPrice(item.price_kobo, item.currency)}
              </p>
              <p className="mt-0.5 text-body-sm text-white/70">{item.location}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
