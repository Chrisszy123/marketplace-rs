import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ApiRequestError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useMessageSocket } from '../../hooks/useMessageSocket'
import { Avatar } from '../ui/Avatar'
import { ChevronLeftIcon } from '../ui/icons'
import { CallButton } from './CallButton'
import { SellerDetailPanel } from './SellerDetailPanel'
import type { Listing, Message, SellerProfile } from '../../api/types'

const QUICK_REPLY = 'Is this still available?'

interface ChatPanelProps {
  listingId: string
  withId: string
  onBack: () => void
}

export function ChatPanel({ listingId, withId, onBack }: ChatPanelProps) {
  const { accessToken, user } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [pinnedListing, setPinnedListing] = useState<Listing | null>(null)
  const [olderCursor, setOlderCursor] = useState<string | null>(null)
  const [hasLoadedFirstPage, setHasLoadedFirstPage] = useState(false)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null)
  const [isSellerLoading, setIsSellerLoading] = useState(true)
  const [sellerError, setSellerError] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  function mergeIncoming(incoming: Message[]) {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]))
      for (const m of incoming) byId.set(m.id, m)
      return Array.from(byId.values()).sort((a, b) => a.created_at.localeCompare(b.created_at))
    })
  }

  useEffect(() => {
    api.getListing(listingId).then(setPinnedListing).catch(() => setPinnedListing(null))
  }, [listingId])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    setIsSellerLoading(true)
    setSellerError(null)
    api
      .getSellerProfile(withId, accessToken)
      .then((profile) => {
        if (!cancelled) setSellerProfile(profile)
      })
      .catch((err) => {
        if (!cancelled) {
          setSellerError(err instanceof ApiRequestError ? err.message : 'Failed to load seller')
        }
      })
      .finally(() => {
        if (!cancelled) setIsSellerLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [withId, accessToken])

  const loadLatest = useCallback(async () => {
    try {
      const res = await api.getThreadMessages(
        listingId,
        { with: withId, limit: 30 },
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
    setMessages([])
    setHasLoadedFirstPage(false)
    setOlderCursor(null)
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
    if (!olderCursor) return
    try {
      const res = await api.getThreadMessages(
        listingId,
        { with: withId, cursor: olderCursor, limit: 30 },
        accessToken as string,
      )
      mergeIncoming(res.items)
      setOlderCursor(res.next_cursor)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to load older messages')
    }
  }

  async function sendBody(text: string) {
    if (!text.trim()) return
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

  const sellerName = sellerProfile?.display_name ?? 'Seller'

  return (
    <div className="flex h-full flex-col bg-brand-bg w-full pr-1">
      <div className="flex shrink-0 items-center gap-1 border-b border-brand-dark/10 bg-white px-2 py-2.5 sm:px-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-dark/60 outline-none transition hover:bg-brand-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green md:hidden"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setIsDetailOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 py-1 text-left outline-none transition hover:bg-brand-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
        >
          <Avatar name={sellerName} url={sellerProfile?.avatar_url} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold text-brand-dark">
              {isSellerLoading ? 'Loading…' : sellerName}
            </p>
            {pinnedListing && (
              <p className="truncate text-caption text-brand-dark/55">Re: {pinnedListing.title}</p>
            )}
          </div>
        </button>

        <CallButton sellerProfile={sellerProfile} isLoading={isSellerLoading} error={sellerError} />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-4">
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

      {error && <p className="shrink-0 px-4 pb-2 text-body-sm text-brand-error">{error}</p>}

      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 gap-2 border-t border-brand-dark/10 bg-white p-3"
      >
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

      {isDetailOpen && (
        <SellerDetailPanel
          sellerId={withId}
          sellerProfile={sellerProfile}
          isLoadingProfile={isSellerLoading}
          profileError={sellerError}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
    </div>
  )
}
