import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiRequestError } from '../api/client'
import { ListingCard } from '../components/ui/ListingCard'
import { useAuth } from '../context/AuthContext'
import { useMessageSocket } from '../hooks/useMessageSocket'
import type { Listing, Message } from '../api/types'

const QUICK_REPLY = 'Is this still available?'

export function ThreadPage() {
  const { id: listingId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const withId = searchParams.get('with')
  const { accessToken, user } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [pinnedListing, setPinnedListing] = useState<Listing | null>(null)
  const [olderCursor, setOlderCursor] = useState<string | null>(null)
  const [hasLoadedFirstPage, setHasLoadedFirstPage] = useState(false)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  function mergeIncoming(incoming: Message[]) {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]))
      for (const m of incoming) byId.set(m.id, m)
      return Array.from(byId.values()).sort((a, b) => a.created_at.localeCompare(b.created_at))
    })
  }

  useEffect(() => {
    if (!listingId) return
    api.getListing(listingId).then(setPinnedListing).catch(() => setPinnedListing(null))
  }, [listingId])

  const loadLatest = useCallback(async () => {
    if (!listingId) return
    try {
      const res = await api.getThreadMessages(
        listingId,
        { with: withId ?? undefined, limit: 30 },
        accessToken as string,
      )
      mergeIncoming(res.items)
      setOlderCursor((prev) => (hasLoadedFirstPage ? prev : res.next_cursor))
      setHasLoadedFirstPage(true)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to load messages')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, withId, accessToken])

  useEffect(() => {
    loadLatest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, withId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useMessageSocket(
    accessToken,
    (incoming) => {
      if (
        incoming.listing_id === listingId &&
        (incoming.sender_id === withId || incoming.recipient_id === withId)
      ) {
        mergeIncoming([incoming])
      }
    },
    loadLatest,
  )

  async function loadOlder() {
    if (!listingId || !olderCursor) return
    try {
      const res = await api.getThreadMessages(
        listingId,
        { with: withId ?? undefined, cursor: olderCursor, limit: 30 },
        accessToken as string,
      )
      mergeIncoming(res.items)
      setOlderCursor(res.next_cursor)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to load older messages')
    }
  }

  async function sendBody(text: string) {
    if (!listingId || !withId || !text.trim()) return
    setError(null)
    setIsSending(true)
    try {
      const sent = await api.sendMessage(
        listingId,
        { body: text.trim(), recipient_id: withId },
        accessToken as string,
      )
      mergeIncoming([sent])
      setBody('')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    sendBody(body)
  }

  if (!listingId || !withId) {
    return <p className="p-8 text-center text-brand-dark">Missing conversation details.</p>
  }

  return (
    <main className="flex h-[calc(100dvh-5rem)] flex-col bg-brand-bg">
      <div className="flex items-center gap-2 border-b border-brand-dark/10 bg-white px-3 py-2.5">
        <Link
          to={`/listings/${listingId}`}
          aria-label="Back to listing"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-dark/60 outline-none transition hover:bg-brand-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        {pinnedListing && (
          <ListingCard
            variant="pinned"
            className="flex-1"
            listing={{
              id: pinnedListing.id,
              title: pinnedListing.title,
              priceKobo: pinnedListing.price_kobo,
              currency: pinnedListing.currency,
              thumbnailUrl: pinnedListing.photos[0]?.url ?? null,
              isBoosted: pinnedListing.is_boosted,
              status: pinnedListing.status,
            }}
          />
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {olderCursor && (
          <button
            type="button"
            onClick={loadOlder}
            className="mx-auto block rounded-full border border-brand-dark/15 px-3 py-1 text-caption font-medium text-brand-dark outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
          >
            Load older messages
          </button>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === user?.id
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-body-sm ${
                  isMine ? 'bg-brand-green text-white' : 'bg-white text-brand-dark shadow-card'
                }`}
              >
                {m.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-2 text-body-sm text-brand-error">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-brand-dark/10 bg-white p-3">
        {messages.length === 0 && (
          <button
            type="button"
            disabled={isSending}
            onClick={() => sendBody(QUICK_REPLY)}
            className="shrink-0 rounded-full border border-brand-dark/15 px-3 py-2 text-caption font-medium text-brand-dark outline-none transition disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
          >
            {QUICK_REPLY}
          </button>
        )}
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-brand-dark/15 px-4 py-2 text-body-sm outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/15"
        />
        <button
          type="submit"
          disabled={isSending || !body.trim()}
          className="rounded-full bg-brand-green px-4 py-2 text-body-sm font-semibold text-white outline-none transition disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
        >
          Send
        </button>
      </form>
    </main>
  )
}
