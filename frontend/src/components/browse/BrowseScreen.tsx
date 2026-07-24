import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, ApiRequestError } from '../../api/client'
import { BottomSheet } from '../ui/BottomSheet'
import { CategoryPillsRow } from './CategoryPillsRow'
import { FAQSection } from './FAQSection'
import { FeaturedCarousel } from './FeaturedCarousel'
import { FilterSidebar, PRICE_CEILING_NAIRA, type FilterValues } from './FilterSidebar'
import { HomeFooter } from './HomeFooter'
import { ListingGrid } from './ListingGrid'
import { TopBar } from './TopBar'
import type { Category, SearchHit, SortOption } from '../../api/types'

interface BrowseScreenProps {
  /** Home-only chrome: featured carousel above the categories, FAQ + footer below the grid. */
  showHomeExtras?: boolean
}

export function BrowseScreen({ showHomeExtras = false }: BrowseScreenProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const q = searchParams.get('q') ?? ''
  const categoryId = searchParams.get('category_id')
  const location = searchParams.get('location') ?? ''
  const minPrice = searchParams.get('min_price')
  const maxPrice = searchParams.get('max_price')
  const sort = (searchParams.get('sort') as SortOption | null) ?? 'relevance'

  const [queryInput, setQueryInput] = useState(q)
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<SearchHit[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => setQueryInput(q), [q])

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const filters: FilterValues = {
    location,
    minPriceNaira: minPrice ? Number(minPrice) : 0,
    maxPriceNaira: maxPrice ? Number(maxPrice) : PRICE_CEILING_NAIRA,
    sort,
  }

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    setSearchParams(next)
  }

  function handleFilterChange(values: FilterValues) {
    updateParams({
      location: values.location || null,
      min_price: values.minPriceNaira > 0 ? String(values.minPriceNaira) : null,
      max_price: values.maxPriceNaira < PRICE_CEILING_NAIRA ? String(values.maxPriceNaira) : null,
      sort: values.sort !== 'relevance' ? values.sort : null,
    })
  }

  function handleClearFilters() {
    updateParams({ location: null, min_price: null, max_price: null, sort: null })
  }

  function handleSearchSubmit(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('q', value.trim())
    else next.delete('q')
    navigate(`/search?${next.toString()}`)
  }

  const filterKey = `${q}|${categoryId}|${location}|${minPrice}|${maxPrice}|${sort}`

  function buildSearchParams(cursorOverride?: string) {
    return {
      q: q || undefined,
      category_id: categoryId || undefined,
      location: location || undefined,
      min_price_kobo: minPrice ? Number(minPrice) * 100 : undefined,
      max_price_kobo: maxPrice ? Number(maxPrice) * 100 : undefined,
      sort,
      cursor: cursorOverride,
      limit: 20,
    }
  }

  // Debounced so slider drags / typed location filters don't fire a request per keystroke.
  useEffect(() => {
    let cancelled = false
    setItems([])
    setCursor(null)
    setIsLoading(true)
    setError(null)

    const timer = window.setTimeout(() => {
      api
        .search(buildSearchParams())
        .then((res) => {
          if (cancelled) return
          setItems(res.items)
          setCursor(res.next_cursor)
        })
        .catch((err) => {
          if (cancelled) return
          setError(err instanceof ApiRequestError ? err.message : 'Failed to load listings')
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false)
        })
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

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
      const res = await api.search(buildSearchParams(cursor))
      setItems((prev) => [...prev, ...res.items])
      setCursor(res.next_cursor)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to load listings')
    } finally {
      setIsLoading(false)
    }
  }

  const topLevelCategories = categories.filter((c) => c.parent_id === null)

  return (
    <div className="min-h-screen bg-brand-bg">
      <TopBar query={queryInput} onQueryChange={setQueryInput} onSubmit={handleSearchSubmit} />

      {showHomeExtras && <FeaturedCarousel />}

      <div className="px-4 py-3 sm:px-6 lg:px-8">
        <CategoryPillsRow
          categories={topLevelCategories}
          activeCategoryId={categoryId}
          onSelect={(id) => updateParams({ category_id: id })}
        />
      </div>

      <div className="flex gap-6 px-4 pb-10 sm:px-6 lg:px-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-20 rounded-2xl bg-white p-5 shadow-card">
            <FilterSidebar values={filters} onChange={handleFilterChange} onClear={handleClearFilters} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between lg:hidden">
            <p className="text-body-sm text-brand-dark/55">
              {isLoading && items.length === 0 ? 'Loading…' : `${items.length} listing${items.length === 1 ? '' : 's'}`}
            </p>
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-brand-dark/15 bg-white px-4 py-2 text-body-sm font-semibold text-brand-dark outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              Filters
            </button>
          </div>

          <ListingGrid
            items={items}
            isLoading={isLoading}
            error={error}
            sentinelRef={sentinelRef}
            emptyAction={{ label: 'Clear filters', onClick: handleClearFilters }}
          />
        </div>
      </div>

      {showHomeExtras && (
        <>
          <FAQSection />
          <HomeFooter />
        </>
      )}

      <BottomSheet open={isFilterSheetOpen} onClose={() => setIsFilterSheetOpen(false)} title="Filters">
        <FilterSidebar
          values={filters}
          onChange={handleFilterChange}
          onClear={() => {
            handleClearFilters()
          }}
        />
        <button
          type="button"
          onClick={() => setIsFilterSheetOpen(false)}
          className="mt-6 w-full rounded-full bg-brand-green py-2.5 text-body-sm font-semibold text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
        >
          Show results
        </button>
      </BottomSheet>
    </div>
  )
}
