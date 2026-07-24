import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { EmptyState } from '../ui/EmptyState'
import { SearchIcon } from '../ui/icons'
import type { ThreadSummary } from '../../api/types'

function threadKey(t: Pick<ThreadSummary, 'listing_id' | 'counterpart_id'>) {
  return `${t.listing_id}:${t.counterpart_id}`
}

function formatTime(iso: string) {
  const date = new Date(iso)
  const isToday = date.toDateString() === new Date().toDateString()
  return isToday
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface ConversationSidebarProps {
  threads: ThreadSummary[]
  isLoading: boolean
  error: string | null
  activeKey: string | null
  className?: string
}

export function ConversationSidebar({
  threads,
  isLoading,
  error,
  activeKey,
  className = '',
}: ConversationSidebarProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return threads
    return threads.filter(
      (t) =>
        t.counterpart_name.toLowerCase().includes(q) ||
        t.listing_title.toLowerCase().includes(q),
    )
  }, [threads, query])

  return (
    <div className={`flex h-full flex-col bg-white ${className}`}>
      <div className="shrink-0 border-b border-brand-dark/10 px-4 py-4">
        <h1 className="mb-3 text-h2 text-brand-dark-green">Messages</h1>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dark/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="w-full rounded-full bg-brand-bg py-2 pl-9 pr-3 text-body-sm outline-none transition focus:ring-2 focus:ring-brand-green/25"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <p className="p-6 text-center text-body-sm text-brand-dark/55">Loading…</p>}
        {error && <p className="p-4 text-body-sm text-brand-error">{error}</p>}

        {!isLoading && !error && threads.length === 0 && (
          <EmptyState
            className="m-4 shadow-none"
            title="No conversations yet."
            body="Message a seller from any listing and the conversation will show up here."
            action={{ label: 'Browse listings', to: '/search' }}
          />
        )}

        {!isLoading && threads.length > 0 && filtered.length === 0 && (
          <p className="p-6 text-center text-body-sm text-brand-dark/55">No conversations match "{query}".</p>
        )}

        <ul>
          {filtered.map((t) => {
            const key = threadKey(t)
            const isActive = key === activeKey
            return (
              <li key={key}>
                <Link
                  to={`/messages/${t.listing_id}?with=${t.counterpart_id}`}
                  className={`flex items-center gap-3 border-b border-brand-dark/5 px-4 py-3 outline-none transition hover:bg-brand-bg focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-green ${
                    isActive ? 'bg-brand-green/10' : ''
                  }`}
                >
                  <Avatar name={t.counterpart_name} url={t.counterpart_avatar_url} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-body-sm font-semibold text-brand-dark">
                        {t.counterpart_name}
                      </p>
                      <span className="shrink-0 text-[11px] text-brand-dark/45">
                        {formatTime(t.last_message_at)}
                      </span>
                    </div>
                    <p className="truncate text-caption text-brand-dark/50">{t.listing_title}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-body-sm text-brand-dark/70">
                        {t.last_message_from_me ? 'You: ' : ''}
                        {t.last_message_body}
                      </p>
                      {t.unread_count > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-green px-1.5 text-[11px] font-semibold text-white">
                          {t.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
