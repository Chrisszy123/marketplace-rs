import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiRequestError } from '../api/client'
import type { Category, SearchHit, SortOption } from '../api/types'

function formatPrice(kobo: number, currency: string) {
  return `${currency === 'NGN' ? '₦' : currency} ${(kobo / 100).toLocaleString()}`
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

export function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const categoryId = searchParams.get('category_id') ?? ''
  const location = searchParams.get('location') ?? ''
  const minPrice = searchParams.get('min_price') ?? ''
  const maxPrice = searchParams.get('max_price') ?? ''
  const sort = (searchParams.get('sort') as SortOption | null) ?? 'relevance'

  const [qInput, setQInput] = useState(q)
  const [locationInput, setLocationInput] = useState(location)
  const [minPriceInput, setMinPriceInput] = useState(minPrice)
  const [maxPriceInput, setMaxPriceInput] = useState(maxPrice)

  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<SearchHit[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const filterKey = `${q}|${categoryId}|${location}|${minPrice}|${maxPrice}|${sort}`

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  function buildParams(cursorOverride?: string) {
    return {
      q: q || undefined,
      category_id: categoryId || undefined,
      location: location || undefined,
      min_price_kobo: minPrice ? Math.round(Number(minPrice) * 100) : undefined,
      max_price_kobo: maxPrice ? Math.round(Number(maxPrice) * 100) : undefined,
      sort,
      cursor: cursorOverride,
      limit: 20,
    }
  }

  // Filters changed (including navigating from a category tile) — reset and fetch page one.
  useEffect(() => {
    let cancelled = false
    setItems([])
    setCursor(null)
    setIsLoading(true)
    setError(null)

    api
      .search(buildParams())
      .then((res) => {
        if (cancelled) return
        setItems(res.items)
        setCursor(res.next_cursor)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiRequestError ? err.message : 'Search failed')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  // Infinite scroll: fetch the next page when the sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !cursor) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, filterKey])

  async function loadMore() {
    if (!cursor || isLoading) return
    setIsLoading(true)
    try {
      const res = await api.search(buildParams(cursor))
      setItems((prev) => [...prev, ...res.items])
      setCursor(res.next_cursor)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Search failed')
    } finally {
      setIsLoading(false)
    }
  }

  function handleFilterSubmit(event: FormEvent) {
    event.preventDefault()
    const next = new URLSearchParams(searchParams)
    if (qInput.trim()) next.set('q', qInput.trim())
    else next.delete('q')
    if (locationInput.trim()) next.set('location', locationInput.trim())
    else next.delete('location')
    if (minPriceInput) next.set('min_price', minPriceInput)
    else next.delete('min_price')
    if (maxPriceInput) next.set('max_price', maxPriceInput)
    else next.delete('max_price')
    setSearchParams(next)
  }

  function setCategory(id: string | null) {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('category_id', id)
    else next.delete('category_id')
    setSearchParams(next)
  }

  function setSort(value: SortOption) {
    const next = new URLSearchParams(searchParams)
    next.set('sort', value)
    setSearchParams(next)
  }

  const topLevelCategories = categories.filter((c) => c.parent_id === null)

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <form onSubmit={handleFilterSubmit} className="mb-4 flex flex-wrap gap-2">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search…"
            className="flex-1 min-w-[160px] rounded-full border border-brand-dark/20 bg-white px-4 py-2 text-sm outline-none focus:border-brand-green"
          />
          <input
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="Location"
            className="w-32 rounded-full border border-brand-dark/20 bg-white px-4 py-2 text-sm outline-none focus:border-brand-green"
          />
          <input
            type="number"
            min={0}
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            placeholder="Min ₦"
            className="w-24 rounded-full border border-brand-dark/20 bg-white px-4 py-2 text-sm outline-none focus:border-brand-green"
          />
          <input
            type="number"
            min={0}
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            placeholder="Max ₦"
            className="w-24 rounded-full border border-brand-dark/20 bg-white px-4 py-2 text-sm outline-none focus:border-brand-green"
          />
          <button
            type="submit"
            className="rounded-full bg-brand-green px-4 py-2 text-sm font-medium text-white"
          >
            Apply
          </button>
        </form>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              !categoryId ? 'bg-brand-green text-white' : 'bg-white text-brand-dark'
            }`}
          >
            All categories
          </button>
          {topLevelCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                categoryId === c.id ? 'bg-brand-green text-white' : 'bg-white text-brand-dark'
              }`}
            >
              {c.name}
            </button>
          ))}

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="ml-auto rounded-full border border-brand-dark/20 bg-white px-3 py-1 text-xs"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {!isLoading && items.length === 0 && !error && (
          <p className="text-brand-dark/70">No listings match your search.</p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/listings/${item.id}`}
              className="rounded-2xl bg-white p-3 shadow-sm"
            >
              <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-lg bg-brand-bg">
                {item.thumbnail_url && (
                  <img src={item.thumbnail_url} alt="" className="h-full w-full object-cover" />
                )}
                {item.is_boosted && (
                  <span className="absolute left-1 top-1 rounded-full bg-brand-boosted px-2 py-0.5 text-[10px] font-semibold text-brand-dark-green">
                    Top Ad
                  </span>
                )}
              </div>
              <p className="truncate text-sm font-medium text-brand-dark">{item.title}</p>
              <p className="text-sm font-semibold text-brand-green">
                {formatPrice(item.price_kobo, item.currency)}
              </p>
              <p className="truncate text-xs text-brand-dark/60">{item.location}</p>
            </Link>
          ))}
        </div>

        <div ref={sentinelRef} className="h-4" />
        {isLoading && <p className="py-4 text-center text-sm text-brand-dark/60">Loading…</p>}
      </div>
    </main>
  )
}
