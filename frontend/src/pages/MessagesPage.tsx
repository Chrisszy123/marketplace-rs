import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiRequestError } from '../api/client'
import { ChatPanel } from '../components/messages/ChatPanel'
import { ConversationSidebar } from '../components/messages/ConversationSidebar'
import { ChatBubbleIcon } from '../components/ui/icons'
import { useAuth } from '../context/AuthContext'
import { useMessageSocket } from '../hooks/useMessageSocket'
import type { ThreadSummary } from '../api/types'

export function MessagesPage() {
  const { listingId } = useParams<{ listingId?: string }>()
  const [searchParams] = useSearchParams()
  const withId = searchParams.get('with')
  const navigate = useNavigate()
  const { accessToken } = useAuth()

  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadThreads = useCallback(async () => {
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
    loadThreads()
  }, [loadThreads])

  // Any push (or poll tick) means the thread list may be stale — just refetch it.
  useMessageSocket(accessToken, loadThreads, loadThreads)

  const isThreadSelected = Boolean(listingId && withId)
  const activeKey = isThreadSelected ? `${listingId}:${withId}` : null

  return (
    <main className="flex h-[calc(100dvh-4rem)] overflow-hidden bg-white">
      <ConversationSidebar
        threads={threads}
        isLoading={isLoading}
        error={error}
        activeKey={activeKey}
        className={`w-full shrink-0 border-r border-brand-dark/10 md:flex md:w-80 lg:w-96 ${
          isThreadSelected ? 'hidden' : 'flex'
        }`}
      />

      <div className={`min-w-0 flex-1 md:flex ${isThreadSelected ? 'flex' : 'hidden'}`}>
        {isThreadSelected && listingId && withId ? (
          <ChatPanel
            key={activeKey ?? undefined}
            listingId={listingId}
            withId={withId}
            onBack={() => navigate('/messages')}
          />
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-3 bg-brand-bg text-center">
            <ChatBubbleIcon className="h-12 w-12 text-brand-dark/20" />
            <p className="text-body-sm text-brand-dark/50">
              Select a conversation to start messaging.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
