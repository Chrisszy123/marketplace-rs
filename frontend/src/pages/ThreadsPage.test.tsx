import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ThreadsPage } from './ThreadsPage'
import { api } from '../api/client'
import type { ThreadSummary } from '../api/types'

vi.mock('../api/client', () => ({
  api: { getThreads: vi.fn() },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ accessToken: 'test-token' }),
}))

vi.mock('../hooks/useMessageSocket', () => ({
  useMessageSocket: vi.fn(),
}))

function makeThread(overrides: Partial<ThreadSummary> = {}): ThreadSummary {
  return {
    listing_id: 'listing-1',
    listing_title: 'iPhone 13',
    counterpart_id: 'user-2',
    counterpart_name: 'Ada Lovelace',
    counterpart_avatar_url: null,
    last_message_body: 'Is this still available?',
    last_message_at: '2026-01-01T00:00:00Z',
    last_message_from_me: false,
    unread_count: 2,
    ...overrides,
  }
}

describe('ThreadsPage', () => {
  it('renders threads with counterpart name, listing title, and unread badge', async () => {
    vi.mocked(api.getThreads).mockResolvedValue({ items: [makeThread()], next_cursor: null })

    render(
      <MemoryRouter>
        <ThreadsPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument())
    expect(screen.getByText('iPhone 13')).toBeInTheDocument()
    expect(screen.getByText('Is this still available?')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows an empty state with no conversations', async () => {
    vi.mocked(api.getThreads).mockResolvedValue({ items: [], next_cursor: null })

    render(
      <MemoryRouter>
        <ThreadsPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('No conversations yet.')).toBeInTheDocument())
  })
})
