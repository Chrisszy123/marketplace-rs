import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiRequestError } from '../api/client'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../context/AuthContext'
import { useMessageSocket } from '../hooks/useMessageSocket'
import type { ThreadSummary } from '../api/types'

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ThreadsPage() {
  const { accessToken } = useAuth()
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await api.getThreads({ limit: 50 }, accessToken as string)
      setThreads(res.items)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    load()
  }, [load])

  // Any push (or poll tick) means the thread list may be stale — just refetch it.
  useMessageSocket(accessToken, load, load)

  if (isLoading) return <p className="p-8 text-center text-brand-dark">Loading…</p>

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-5 text-h1 text-brand-dark-green">Messages</h1>
        {error && <p className="mb-4 text-body-sm text-brand-error">{error}</p>}
        {threads.length === 0 && !error && (
          <EmptyState
            title="No conversations yet."
            body="Message a seller from any listing and the conversation will show up here."
            action={{ label: 'Browse listings', to: '/search' }}
          />
        )}
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={`${t.listing_id}:${t.counterpart_id}`}>
              <Link
                to={`/listings/${t.listing_id}/chat?with=${t.counterpart_id}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-card outline-none transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
              >
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-semibold text-brand-dark">{t.counterpart_name}</p>
                  <p className="truncate text-caption text-brand-dark/55">{t.listing_title}</p>
                  <p className="truncate text-body-sm text-brand-dark/70">
                    {t.last_message_from_me ? 'You: ' : ''}
                    {t.last_message_body}
                  </p>
                </div>
                <div className="ml-3 flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-caption text-brand-dark/45">{formatTime(t.last_message_at)}</span>
                  {t.unread_count > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-green px-1.5 text-[11px] font-semibold text-white">
                      {t.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
