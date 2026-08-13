import { Link } from 'react-router-dom'
import type { Category } from '../../api/types'

interface ListingBreadcrumbProps {
  categories: Category[]
  categoryId: string
  title: string
}

export function ListingBreadcrumb({ categories, categoryId, title }: ListingBreadcrumbProps) {
  const category = categories.find((c) => c.id === categoryId)
  const topCategory = category?.parent_id ? categories.find((c) => c.id === category.parent_id) : null
  const crumbs = [topCategory, topCategory ? category : null].filter((c): c is Category => Boolean(c))

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-caption text-brand-dark/50">
      <Link to="/search" className="outline-none hover:text-brand-dark hover:underline focus-visible:underline">
        Browse
      </Link>
      {crumbs.map((c) => (
        <span key={c.id} className="flex items-center gap-1.5">
          <span aria-hidden="true">/</span>
          <Link
            to={`/search?category_id=${c.id}`}
            className="outline-none hover:text-brand-dark hover:underline focus-visible:underline"
          >
            {c.name}
          </Link>
        </span>
      ))}
      <span aria-hidden="true">/</span>
      <span className="truncate text-brand-dark/70" aria-current="page">
        {title}
      </span>
    </nav>
  )
}
