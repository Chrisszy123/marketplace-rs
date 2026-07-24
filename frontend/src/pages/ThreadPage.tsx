import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiRequestError } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useMessageSocket } from '../hooks/useMessageSocket'
import type { Message } from '../api/types'

const QUICK_REPLY = 'Is this still available?'

export function ThreadPage() {
  const { id: listingId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const withId = searchParams.get('with')
  const { accessToken, user } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
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
    <main className="flex min-h-screen flex-col bg-brand-bg">
      <div className="border-b border-brand-dark/10 bg-white px-4 py-3">
        <Link to={`/listings/${listingId}`} className="text-sm text-brand-green">
          ← Back to listing
        </Link>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {olderCursor && (
          <button
            type="button"
            onClick={loadOlder}
            className="mx-auto block rounded-full border border-brand-dark/20 px-3 py-1 text-xs text-brand-dark"
          >
            Load older messages
          </button>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === user?.id
          return (
            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isMine ? 'bg-brand-green text-white' : 'bg-white text-brand-dark'
                }`}
              >
                {m.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-brand-dark/10 bg-white p-3">
        {messages.length === 0 && (
          <button
            type="button"
            disabled={isSending}
            onClick={() => sendBody(QUICK_REPLY)}
            className="shrink-0 rounded-full border border-brand-dark/20 px-3 py-2 text-xs text-brand-dark disabled:opacity-60"
          >
            {QUICK_REPLY}
          </button>
        )}
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-brand-dark/20 px-4 py-2 text-sm outline-none focus:border-brand-green"
        />
        <button
          type="submit"
          disabled={isSending || !body.trim()}
          className="rounded-full bg-brand-green px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </main>
  )
}
