import { getCategoryIcon } from './categoryIcons'
import type { Category } from '../../api/types'

interface CategoryPillsRowProps {
  categories: Category[]
  activeCategoryId: string | null
  onSelect: (id: string | null) => void
}

export function CategoryPillsRow({ categories, activeCategoryId, onSelect }: CategoryPillsRowProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-3 sm:px-0 sm:pb-1" role="tablist" aria-label="Categories">
      <button
        type="button"
        role="tab"
        aria-selected={activeCategoryId === null}
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-full px-4 py-2 text-body-sm font-semibold outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${
          activeCategoryId === null ? 'bg-brand-green text-white' : 'bg-white text-brand-dark'
        }`}
      >
        All categories
      </button>
      {categories.map((category) => {
        const Icon = getCategoryIcon(category.slug)
        const isActive = activeCategoryId === category.id
        return (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(category.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-body-sm font-semibold outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${
              isActive ? 'bg-brand-green text-white' : 'bg-white text-brand-dark'
            }`}
          >
            <Icon className="h-4 w-4" />
            {category.name}
          </button>
        )
      })}
    </div>
  )
}
