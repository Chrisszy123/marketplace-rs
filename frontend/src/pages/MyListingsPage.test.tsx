import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MyListingsPage } from './MyListingsPage'
import { api } from '../api/client'
import type { Listing } from '../api/types'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ accessToken: 'test-token' }),
}))

vi.mock('../api/client', () => ({
  api: { getMyListings: vi.fn(), deleteListing: vi.fn(), renewListing: vi.fn() },
  ApiRequestError: class ApiRequestError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    seller_id: 'user-1',
    category_id: 'cat-1',
    listing_type: 'good',
    title: 'iPhone 13',
    description: 'Barely used.',
    price_kobo: 45_000_000,
    currency: 'NGN',
    location: 'Lagos',
    condition: 'used',
    service_area: null,
    status: 'active',
    is_boosted: false,
    published_at: '2026-01-01T00:00:00Z',
    expires_at: '2026-01-31T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    photos: [],
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MyListingsPage />
    </MemoryRouter>,
  )
}

describe('MyListingsPage', () => {
  it('renders listings with a status badge', async () => {
    vi.mocked(api.getMyListings).mockResolvedValue({
      items: [makeListing()],
      next_cursor: null,
    })

    renderPage()

    await waitFor(() => expect(screen.getByText('iPhone 13')).toBeInTheDocument())
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('removes a listing from the list after deleting it', async () => {
    vi.mocked(api.getMyListings).mockResolvedValue({
      items: [makeListing()],
      next_cursor: null,
    })
    vi.mocked(api.deleteListing).mockResolvedValue(undefined)

    renderPage()

    await waitFor(() => expect(screen.getByText('iPhone 13')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('iPhone 13')).not.toBeInTheDocument())
    expect(api.deleteListing).toHaveBeenCalledWith('listing-1', 'test-token')
  })

  it('loads the next page and appends results when "Load more" is clicked', async () => {
    vi.mocked(api.getMyListings).mockResolvedValueOnce({
      items: [makeListing({ id: 'listing-1', title: 'First listing' })],
      next_cursor: 'cursor-abc',
    })

    renderPage()

    await waitFor(() => expect(screen.getByText('First listing')).toBeInTheDocument())
    const loadMore = screen.getByRole('button', { name: 'Load more' })

    vi.mocked(api.getMyListings).mockResolvedValueOnce({
      items: [makeListing({ id: 'listing-2', title: 'Second listing' })],
      next_cursor: null,
    })

    fireEvent.click(loadMore)

    await waitFor(() => expect(screen.getByText('Second listing')).toBeInTheDocument())
    expect(screen.getByText('First listing')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    expect(api.getMyListings).toHaveBeenLastCalledWith(
      { cursor: 'cursor-abc', limit: 20 },
      'test-token',
    )
  })
})
