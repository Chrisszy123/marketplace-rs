import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProfilePage } from './ProfilePage'
import { SellSheetProvider } from '../context/SellSheetContext'
import { api } from '../api/client'
import type { Listing } from '../api/types'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    status: 'authenticated',
    accessToken: 'test-token',
    user: {
      id: 'user-1',
      email: 'ada@example.com',
      display_name: 'Ada Lovelace',
      avatar_url: null,
      location: null,
      phone_verified: true,
      member_since: '2026-01-01T00:00:00Z',
      rating: null,
    },
    logout: vi.fn(),
  }),
}))

vi.mock('../api/client', () => ({
  api: {
    getMyListings: vi.fn(),
    deleteListing: vi.fn(),
    renewListing: vi.fn(),
    getListing: vi.fn(),
    getThreads: vi.fn(),
  },
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

function renderProfile(initialPath = '/profile') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SellSheetProvider>
        <ProfilePage />
      </SellSheetProvider>
    </MemoryRouter>,
  )
}

describe('ProfilePage', () => {
  it('defaults to the Selling tab and shows listings with a status pill', async () => {
    vi.mocked(api.getMyListings).mockResolvedValue({ items: [makeListing()], next_cursor: null })
    vi.mocked(api.getThreads).mockResolvedValue({ items: [], next_cursor: null })

    renderProfile()

    await waitFor(() => expect(screen.getByText('iPhone 13')).toBeInTheDocument())
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('removes a listing from the Selling tab after deleting it', async () => {
    vi.mocked(api.getMyListings).mockResolvedValue({ items: [makeListing()], next_cursor: null })
    vi.mocked(api.deleteListing).mockResolvedValue(undefined)
    vi.mocked(api.getThreads).mockResolvedValue({ items: [], next_cursor: null })

    renderProfile()

    await waitFor(() => expect(screen.getByText('iPhone 13')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('iPhone 13')).not.toBeInTheDocument())
    expect(api.deleteListing).toHaveBeenCalledWith('listing-1', 'test-token')
  })

  it('switches to the Buying tab and shows an empty state with nothing saved', async () => {
    vi.mocked(api.getMyListings).mockResolvedValue({ items: [], next_cursor: null })
    vi.mocked(api.getThreads).mockResolvedValue({ items: [], next_cursor: null })

    renderProfile()

    fireEvent.click(screen.getByRole('button', { name: 'buying' }))

    await waitFor(() => expect(screen.getByText('Nothing saved yet.')).toBeInTheDocument())
  })

  it('opens directly on the Buying tab via ?tab=buying', async () => {
    vi.mocked(api.getMyListings).mockResolvedValue({ items: [], next_cursor: null })
    vi.mocked(api.getThreads).mockResolvedValue({ items: [], next_cursor: null })

    renderProfile('/profile?tab=buying')

    await waitFor(() => expect(screen.getByText('Nothing saved yet.')).toBeInTheDocument())
  })
})
