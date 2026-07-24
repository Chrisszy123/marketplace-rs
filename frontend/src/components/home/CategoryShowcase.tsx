import { Link } from 'react-router-dom'
import type { Category } from '../../api/types'
import { getCategoryIcon } from './categoryIcons'

export function CategoryShowcase({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null

  return (
    <section className="bg-brand-cream px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold text-brand-dark-green sm:text-3xl">
            Browse by category
          </h2>
          <Link
            to="/search"
            className="text-sm font-medium text-brand-green outline-none hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
          >
            See all listings →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.slug)
            return (
              <Link
                key={category.id}
                to={`/search?category_id=${category.id}`}
                className="group relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm outline-none transition hover:bg-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
              >
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-green/10 text-brand-green transition group-hover:bg-white/20 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-brand-dark-green transition group-hover:text-white">
                  {category.name}
                </p>
                <span className="mt-1 block text-xs text-brand-dark/50 opacity-0 transition group-hover:text-white/80 group-hover:opacity-100">
                  Browse →
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
