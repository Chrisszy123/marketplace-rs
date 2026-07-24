import { PriceRangeSlider } from './PriceRangeSlider'
import type { SortOption } from '../../api/types'

export const PRICE_CEILING_NAIRA = 5_000_000

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'date', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

export interface FilterValues {
  location: string
  minPriceNaira: number
  maxPriceNaira: number
  sort: SortOption
}

interface FilterSidebarProps {
  values: FilterValues
  onChange: (values: FilterValues) => void
  onClear: () => void
}

export function FilterSidebar({ values, onChange, onClear }: FilterSidebarProps) {
  const hasActiveFilters =
    values.location !== '' || values.minPriceNaira > 0 || values.maxPriceNaira < PRICE_CEILING_NAIRA

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-label text-brand-dark/45">Filters</p>
        {hasActiveFilters && (
          <button type="button" onClick={onClear} className="text-caption font-semibold text-brand-green">
            Clear
          </button>
        )}
      </div>

      <div>
        <p className="mb-2 text-body-sm font-semibold text-brand-dark">Price range</p>
        <PriceRangeSlider
          min={0}
          max={PRICE_CEILING_NAIRA}
          step={5_000}
          valueMin={values.minPriceNaira}
          valueMax={values.maxPriceNaira}
          onChange={(minPriceNaira, maxPriceNaira) => onChange({ ...values, minPriceNaira, maxPriceNaira })}
        />
      </div>

      <label htmlFor="filter-location" className="block text-body-sm font-semibold text-brand-dark">
        Location
        <input
          id="filter-location"
          value={values.location}
          onChange={(e) => onChange({ ...values, location: e.target.value })}
          placeholder="City or area"
          className="mt-1.5 w-full rounded-xl border border-brand-dark/15 bg-white px-3.5 py-2.5 text-body-sm outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/15"
        />
      </label>

      <label htmlFor="filter-sort" className="block text-body-sm font-semibold text-brand-dark">
        Sort by
        <select
          id="filter-sort"
          value={values.sort}
          onChange={(e) => onChange({ ...values, sort: e.target.value as SortOption })}
          className="mt-1.5 w-full rounded-xl border border-brand-dark/15 bg-white px-3.5 py-2.5 text-body-sm outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/15"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {/*
        Extension point: category-specific filters (bedrooms for Property, mileage for
        Vehicles, etc.) slot in here once designed — keyed off the active category, not
        invented generically ahead of need.
      */}
    </div>
  )
}
