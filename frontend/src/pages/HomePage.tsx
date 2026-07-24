import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Category } from '../api/types'

export function HomePage() {
  const { status } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  const topLevelCategories = categories.filter((c) => c.parent_id === null)

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    navigate(`/search?${params.toString()}`)
  }

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-10">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="mb-2 text-3xl font-semibold text-brand-dark-green">Marketplace</h1>
        <p className="mb-6 text-brand-dark">Placeholder wordmark — real logo mark pending.</p>

        <form onSubmit={handleSearch} className="mx-auto mb-4 flex max-w-lg gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for anything…"
            className="flex-1 rounded-full border border-brand-dark/20 bg-white px-4 py-2 outline-none focus:border-brand-green"
          />
          <button
            type="submit"
            className="rounded-full bg-brand-green px-5 py-2 font-medium text-white"
          >
            Search
          </button>
        </form>

        <div className="mb-8 flex justify-center gap-3">
          {status === 'authenticated' ? (
            <Link
              to="/profile"
              className="rounded-full border border-brand-dark/20 px-4 py-2 text-sm font-medium text-brand-dark"
            >
              My account
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full border border-brand-dark/20 px-4 py-2 text-sm font-medium text-brand-dark"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-brand-green px-4 py-2 text-sm font-medium text-white"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {topLevelCategories.map((category) => (
            <Link
              key={category.id}
              to={`/search?category_id=${category.id}`}
              className="rounded-2xl bg-white p-4 text-sm font-medium text-brand-dark-green shadow-sm hover:bg-brand-bg"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
