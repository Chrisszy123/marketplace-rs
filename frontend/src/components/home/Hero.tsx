import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ListingTicker } from './ListingTicker'

export function Hero() {
  const { status } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    navigate(`/search?${params.toString()}`)
  }

  return (
    <header className="bg-brand-dark-green text-white">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-16 text-center sm:pt-20">
        <p className="mb-3 text-sm font-medium text-brand-boosted">Marketplace</p>
        <h1 className="mx-auto mb-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
          Buy it, sell it, right in your city.
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-base text-white/70 sm:text-lg">
          Electronics, cars, property, fashion, jobs, services and more — search what's nearby,
          message the seller directly, and sort out the rest between yourselves.
        </p>

        <form onSubmit={handleSearch} className="mx-auto mb-6 flex max-w-lg gap-2">
          <label htmlFor="hero-search" className="sr-only">
            Search listings
          </label>
          <input
            id="hero-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for anything…"
            className="flex-1 rounded-full border border-transparent bg-white px-4 py-3 text-brand-dark outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-boosted"
          />
          <button
            type="submit"
            className="rounded-full bg-brand-green px-6 py-3 font-medium text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-boosted"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap justify-center gap-3">
          {status === 'authenticated' ? (
            <>
              <Link
                to="/profile"
                className="rounded-full bg-brand-green px-5 py-2 text-sm font-medium text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-boosted"
              >
                My account
              </Link>
              <Link
                to="/search"
                className="rounded-full border border-white/30 px-5 py-2 text-sm font-medium text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-boosted"
              >
                Browse listings
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/signup"
                className="rounded-full bg-brand-green px-5 py-2 text-sm font-medium text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-boosted"
              >
                Sign up
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-white/30 px-5 py-2 text-sm font-medium text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-boosted"
              >
                Log in
              </Link>
              <Link
                to="/search"
                className="rounded-full px-5 py-2 text-sm font-medium text-white/70 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-boosted"
              >
                Browse listings
              </Link>
            </>
          )}
        </div>
      </div>

      <ListingTicker />
    </header>
  )
}
