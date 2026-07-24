import { useEffect, useRef } from 'react'
import { websocketUrl } from '../api/client'
import type { Message, WsNewMessageEvent } from '../api/types'

const POLL_INTERVAL_MS = 4000

/**
 * Real-time message delivery over WebSocket, with a polling fallback when the socket can't
 * connect or drops. `onMessage` fires for every pushed message (the caller filters to the
 * thread it cares about); `onPollTick` fires on the same cadence whenever we've fallen back to
 * polling, so the caller can re-fetch.
 */
export function useMessageSocket(
  accessToken: string | null,
  onMessage: (message: Message) => void,
  onPollTick: () => void,
) {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage
  const onPollTickRef = useRef(onPollTick)
  onPollTickRef.current = onPollTick

  useEffect(() => {
    if (!accessToken) return

    let pollHandle: ReturnType<typeof setInterval> | null = null
    let closedByUs = false

    function startPolling() {
      if (pollHandle) return
      pollHandle = setInterval(() => onPollTickRef.current(), POLL_INTERVAL_MS)
    }
    function stopPolling() {
      if (pollHandle) {
        clearInterval(pollHandle)
        pollHandle = null
      }
    }

    let socket: WebSocket
    try {
      socket = new WebSocket(websocketUrl(accessToken))
    } catch {
      startPolling()
      return () => stopPolling()
    }

    socket.onopen = () => stopPolling()
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as WsNewMessageEvent
        if (data.type === 'new_message') onMessageRef.current(data.message)
      } catch {
        // ignore malformed frames
      }
    }
    socket.onerror = () => startPolling()
    socket.onclose = () => {
      if (!closedByUs) startPolling()
    }

    return () => {
      closedByUs = true
      stopPolling()
      socket.close()
    }
  }, [accessToken])
}
