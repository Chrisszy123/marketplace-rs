import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThreadPage } from './ThreadPage'
import { api } from '../api/client'
import type { Message } from '../api/types'

vi.mock('../api/client', () => ({
  api: { getThreadMessages: vi.fn(), sendMessage: vi.fn(), getListing: vi.fn() },
  ApiRequestError: class ApiRequestError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

beforeEach(() => {
  vi.mocked(api.getListing).mockResolvedValue({
    id: 'listing-1',
    seller_id: 'seller-1',
    category_id: 'cat-1',
    listing_type: 'good',
    title: 'iPhone 13',
    description: 'Barely used',
    price_kobo: 45_000_000,
    currency: 'NGN',
    location: 'Lagos',
    condition: 'used',
    service_area: null,
    status: 'active',
    is_boosted: false,
    published_at: '2026-01-01T00:00:00Z',
    expires_at: '2026-02-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    photos: [],
  })
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'test-token',
    user: { id: 'buyer-1', display_name: 'Buyer', email: '', avatar_url: null, location: null, phone_verified: true, member_since: '', rating: null },
  }),
}))

vi.mock('../hooks/useMessageSocket', () => ({
  useMessageSocket: vi.fn(),
}))

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    listing_id: 'listing-1',
    sender_id: 'seller-1',
    recipient_id: 'buyer-1',
    body: 'Yes, still available',
    read_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderThread() {
  return render(
    <MemoryRouter initialEntries={['/listings/listing-1/chat?with=seller-1']}>
      <Routes>
        <Route path="/listings/:id/chat" element={<ThreadPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ThreadPage', () => {
  it('pins the listing at the top of the thread with its live status', async () => {
    vi.mocked(api.getThreadMessages).mockResolvedValue({ items: [], next_cursor: null })

    renderThread()

    await waitFor(() => expect(screen.getByText(/Still active/)).toBeInTheDocument())
  })

  it('renders existing messages', async () => {
    vi.mocked(api.getThreadMessages).mockResolvedValue({
      items: [makeMessage()],
      next_cursor: null,
    })

    renderThread()

    await waitFor(() => expect(screen.getByText('Yes, still available')).toBeInTheDocument())
  })

  it('sends the quick reply with one tap when the thread is empty', async () => {
    vi.mocked(api.getThreadMessages).mockResolvedValue({ items: [], next_cursor: null })
    vi.mocked(api.sendMessage).mockResolvedValue(
      makeMessage({ id: 'msg-2', sender_id: 'buyer-1', recipient_id: 'seller-1', body: 'Is this still available?' }),
    )

    renderThread()

    const quickReply = await screen.findByRole('button', { name: 'Is this still available?' })
    fireEvent.click(quickReply)

    await waitFor(() =>
      expect(api.sendMessage).toHaveBeenCalledWith(
        'listing-1',
        { body: 'Is this still available?', recipient_id: 'seller-1' },
        'test-token',
      ),
    )
    await waitFor(() => expect(screen.getByText('Is this still available?')).toBeInTheDocument())
  })

  it('sends a typed message via the form', async () => {
    vi.mocked(api.getThreadMessages).mockResolvedValue({ items: [], next_cursor: null })
    vi.mocked(api.sendMessage).mockResolvedValue(
      makeMessage({ id: 'msg-3', sender_id: 'buyer-1', recipient_id: 'seller-1', body: 'Can you do a lower price?' }),
    )

    renderThread()

    await screen.findByRole('button', { name: 'Is this still available?' })
    fireEvent.change(screen.getByPlaceholderText('Type a message…'), {
      target: { value: 'Can you do a lower price?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() =>
      expect(api.sendMessage).toHaveBeenCalledWith(
        'listing-1',
        { body: 'Can you do a lower price?', recipient_id: 'seller-1' },
        'test-token',
      ),
    )
  })

  it('shows a "load older messages" button when a next_cursor is returned', async () => {
    vi.mocked(api.getThreadMessages).mockResolvedValue({
      items: [makeMessage()],
      next_cursor: 'cursor-abc',
    })

    renderThread()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Load older messages' })).toBeInTheDocument(),
    )
  })
})
