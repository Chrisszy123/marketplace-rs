import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getViewerId } from '../../lib/deviceId'
import { loadFavoriteIds } from '../../lib/favorites'

interface TopBarProps {
  query: string
  onQueryChange: (value: string) => void
  onSubmit: (value: string) => void
}

export function TopBar({ query, onQueryChange, onSubmit }: TopBarProps) {
  const { status, user } = useAuth()
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    setSavedCount(loadFavoriteIds(getViewerId(user?.id)).length)
  }, [user])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(query)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-brand-dark/10 bg-white/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="shrink-0 text-h3 font-semibold text-brand-dark-green">
          Marketplace
        </Link>

        <form onSubmit={handleSubmit} className="flex-1">
          <label htmlFor="topbar-search" className="sr-only">
            Search listings
          </label>
          <input
            id="topbar-search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search for anything…"
            className="w-full rounded-full border border-brand-dark/15 bg-brand-bg px-4 py-2.5 text-body-sm outline-none transition focus:border-brand-green focus:bg-white focus:ring-2 focus:ring-brand-green/15"
          />
        </form>

        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          <Link
            to="/profile?tab=buying"
            aria-label={`Saved listings${savedCount > 0 ? ` (${savedCount})` : ''}`}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-brand-dark/60 outline-none transition hover:bg-brand-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.5s-7.5-4.6-9.8-9.1C.6 8 2 4.5 5.6 4c2-.3 3.7.6 4.9 2.3 1.2-1.7 2.9-2.6 4.9-2.3C18.9 4.5 20.4 8 18.7 11.4 16.5 15.9 12 20.5 12 20.5z"
              />
            </svg>
            {savedCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-green px-1 text-[10px] font-semibold text-white">
                {savedCount}
              </span>
            )}
          </Link>
          <Link
            to="/messages"
            aria-label="Messages"
            className="flex h-9 w-9 items-center justify-center rounded-full text-brand-dark/60 outline-none transition hover:bg-brand-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 5.5h16v11H9l-4 3.5v-3.5H4z" />
            </svg>
          </Link>

          {status === 'authenticated' ? (
            <Link
              to="/profile"
              aria-label="Your profile"
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-brand-bg text-body-sm font-semibold text-brand-dark-green outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
            >
              {user?.display_name.charAt(0).toUpperCase()}
            </Link>
          ) : (
            <div className="ml-1 flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-full px-3.5 py-1.5 text-body-sm font-semibold text-brand-dark outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-brand-green px-3.5 py-1.5 text-body-sm font-semibold text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
