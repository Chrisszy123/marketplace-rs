import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MessagesPage } from './MessagesPage'
import { api } from '../api/client'
import type { Listing, Message, SellerProfile, ThreadSummary } from '../api/types'

vi.mock('../api/client', () => ({
  api: {
    getThreads: vi.fn(),
    getThreadMessages: vi.fn(),
    sendMessage: vi.fn(),
    getListing: vi.fn(),
    getSellerProfile: vi.fn(),
    getSellerListings: vi.fn(),
  },
  ApiRequestError: class ApiRequestError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'test-token',
    user: {
      id: 'buyer-1',
      display_name: 'Buyer',
      email: '',
      avatar_url: null,
      location: null,
      phone_verified: true,
      member_since: '',
      rating: null,
    },
  }),
}))

vi.mock('../hooks/useMessageSocket', () => ({
  useMessageSocket: vi.fn(),
}))

function makeThread(overrides: Partial<ThreadSummary> = {}): ThreadSummary {
  return {
    listing_id: 'listing-1',
    listing_title: 'iPhone 13',
    counterpart_id: 'seller-1',
    counterpart_name: 'Ada Lovelace',
    counterpart_avatar_url: null,
    last_message_body: 'Is this still available?',
    last_message_at: '2026-01-01T00:00:00Z',
    last_message_from_me: false,
    unread_count: 2,
    ...overrides,
  }
}

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

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
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
    seller: null,
    ...overrides,
  }
}

function makeSellerProfile(overrides: Partial<SellerProfile> = {}): SellerProfile {
  return {
    id: 'seller-1',
    display_name: 'Ada Lovelace',
    avatar_url: null,
    location: 'Lagos',
    phone_number: '+2348012345678',
    phone_verified: true,
    member_since: '2025-01-01T00:00:00Z',
    rating: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(api.getThreads).mockResolvedValue({ items: [makeThread()], next_cursor: null })
  vi.mocked(api.getListing).mockResolvedValue(makeListing())
  vi.mocked(api.getThreadMessages).mockResolvedValue({ items: [], next_cursor: null })
  vi.mocked(api.getSellerProfile).mockResolvedValue(makeSellerProfile())
  vi.mocked(api.getSellerListings).mockResolvedValue({ items: [] })
})

function renderMessages(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:listingId" element={<MessagesPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MessagesPage sidebar', () => {
  it('renders threads with counterpart name, listing title, and unread badge', async () => {
    renderMessages('/messages')

    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument())
    expect(screen.getAllByText('iPhone 13').length).toBeGreaterThan(0)
    expect(screen.getByText('Is this still available?')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows an empty state with no conversations', async () => {
    vi.mocked(api.getThreads).mockResolvedValue({ items: [], next_cursor: null })

    renderMessages('/messages')

    await waitFor(() => expect(screen.getByText('No conversations yet.')).toBeInTheDocument())
  })

  it('filters conversations via the search box', async () => {
    renderMessages('/messages')

    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Search conversations'), { target: { value: 'nobody' } })

    await waitFor(() => expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument())
  })
})

describe('MessagesPage chat panel', () => {
  it('shows the seller name and pinned listing once a thread is opened', async () => {
    renderMessages('/messages/listing-1?with=seller-1')

    await waitFor(() => expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0))
    expect(screen.getByText('Re: iPhone 13')).toBeInTheDocument()
  })

  it('renders existing messages', async () => {
    vi.mocked(api.getThreadMessages).mockResolvedValue({ items: [makeMessage()], next_cursor: null })

    renderMessages('/messages/listing-1?with=seller-1')

    await waitFor(() => expect(screen.getByText('Yes, still available')).toBeInTheDocument())
  })

  it('sends the quick reply with one tap when the thread is empty', async () => {
    vi.mocked(api.sendMessage).mockResolvedValue(
      makeMessage({ id: 'msg-2', sender_id: 'buyer-1', recipient_id: 'seller-1', body: 'Is this still available?' }),
    )

    renderMessages('/messages/listing-1?with=seller-1')

    const quickReply = await screen.findByRole('button', { name: 'Is this still available?' })
    fireEvent.click(quickReply)

    await waitFor(() =>
      expect(api.sendMessage).toHaveBeenCalledWith(
        'listing-1',
        { body: 'Is this still available?', recipient_id: 'seller-1' },
        'test-token',
      ),
    )
  })

  it('sends a typed message via the form', async () => {
    vi.mocked(api.sendMessage).mockResolvedValue(
      makeMessage({ id: 'msg-3', sender_id: 'buyer-1', recipient_id: 'seller-1', body: 'Can you do a lower price?' }),
    )

    renderMessages('/messages/listing-1?with=seller-1')

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

    renderMessages('/messages/listing-1?with=seller-1')

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Load older messages' })).toBeInTheDocument(),
    )
  })
})

describe('MessagesPage seller detail panel', () => {
  it('opens with seller info and top shop items when the header is clicked', async () => {
    vi.mocked(api.getSellerListings).mockResolvedValue({ items: [makeListing({ id: 'listing-2', title: 'MacBook Pro' })] })

    renderMessages('/messages/listing-1?with=seller-1')

    const headerButton = await screen.findByRole('button', { name: /Ada Lovelace/ })
    fireEvent.click(headerButton)

    expect(await screen.findByText('Seller details')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /\+2348012345678/ })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('MacBook Pro')).toBeInTheDocument())
  })
})

describe('MessagesPage call button', () => {
  it('reveals the seller phone number on click', async () => {
    renderMessages('/messages/listing-1?with=seller-1')

    await screen.findByRole('button', { name: /Ada Lovelace/ })
    fireEvent.click(screen.getByRole('button', { name: 'Call seller' }))

    await waitFor(() => expect(screen.getByText('+2348012345678')).toBeInTheDocument())
  })
})
