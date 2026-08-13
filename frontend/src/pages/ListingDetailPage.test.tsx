import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ListingDetailPage } from './ListingDetailPage'
import { AuthProvider } from '../context/AuthContext'
import { AuthPromptProvider } from '../context/AuthPromptContext'

const LISTING_RESPONSE = {
  id: 'listing-1',
  seller_id: 'seller-1',
  category_id: 'cat-1',
  listing_type: 'good',
  title: 'Toyota Camry 2018',
  description: 'Clean, one owner.',
  price_kobo: 850_000_000,
  currency: 'NGN',
  location: 'Ikeja, Lagos',
  condition: 'used',
  service_area: null,
  status: 'active',
  is_boosted: false,
  published_at: '2026-01-01T00:00:00Z',
  expires_at: '2026-02-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  photos: [],
  seller: {
    id: 'seller-1',
    display_name: 'Ada Lovelace',
    avatar_url: null,
    member_since: '2025-06-01T00:00:00Z',
    phone_verified: true,
  },
}

const SELLER_PROFILE_RESPONSE = {
  id: 'seller-1',
  display_name: 'Ada Lovelace',
  avatar_url: null,
  location: 'Lagos',
  phone_number: '+2348012345678',
  phone_verified: true,
  member_since: '2025-06-01T00:00:00Z',
  rating: null,
}

function mockFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('/auth/refresh')) {
        return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) })
      }
      if (url.includes('/auth/login') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ access_token: 'token-abc', user_id: 'buyer-1' }),
        })
      }
      if (url.includes('/users/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: 'buyer-1',
              email: 'ada@example.com',
              display_name: 'Ada Lovelace',
              avatar_url: null,
              location: null,
              phone_verified: true,
              member_since: '2026-01-01T00:00:00Z',
              rating: null,
            }),
        })
      }
      if (url.includes('/users/seller-1/listings')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ items: [] }) })
      }
      if (url.includes('/users/seller-1')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SELLER_PROFILE_RESPONSE) })
      }
      if (url.includes('/categories')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) })
      }
      if (url.includes('/search')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ items: [], next_cursor: null }) })
      }
      if (url.includes('/listings/listing-1')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(LISTING_RESPONSE) })
      }
      return Promise.reject(new Error(`unexpected fetch to ${url}`))
    }),
  )
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/listings/listing-1']}>
      <AuthProvider>
        <AuthPromptProvider>
          <Routes>
            <Route path="/listings/:id" element={<ListingDetailPage />} />
            <Route path="/messages/:listingId" element={<p>Chat page reached</p>} />
          </Routes>
        </AuthPromptProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('ListingDetailPage with no session at all', () => {
  it('shows the full listing — title, description, price — without requiring an account', async () => {
    mockFetch()
    renderDetail()

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Toyota Camry 2018' })).toBeInTheDocument(),
    )
    expect(screen.getByText('Clean, one owner.')).toBeInTheDocument()
    expect(screen.getByText(/₦/)).toBeInTheDocument()
  })

  it('shows the seller name without requiring login', async () => {
    mockFetch()
    renderDetail()

    await waitFor(() => expect(screen.getAllByText('Ada Lovelace').length).toBeGreaterThan(0))
  })

  it('can save a listing as a guest, no login required', async () => {
    mockFetch()
    renderDetail()

    const saveButton = await screen.findByRole('button', { name: 'Save listing' })
    fireEvent.click(saveButton)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove from saved' })).toBeInTheDocument(),
    )
  })

  it('prompts login in place when messaging the seller, then completes the action after signing in', async () => {
    mockFetch()
    renderDetail()

    const messageButton = await screen.findByRole('button', { name: 'Message seller' })
    fireEvent.click(messageButton)

    await screen.findByRole('dialog', { name: 'Log in to continue' })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => expect(screen.getByText('Chat page reached')).toBeInTheDocument())
  })

  it('prompts login to reveal the phone number, then shows it after signing in', async () => {
    mockFetch()
    renderDetail()

    const phoneButton = await screen.findByRole('button', { name: 'Show phone number' })
    fireEvent.click(phoneButton)

    await screen.findByRole('dialog', { name: 'Log in to continue' })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => expect(screen.getByText('+2348012345678')).toBeInTheDocument())
  })

  it('switches to the Seller & Reviews tab and shows an honest empty state', async () => {
    mockFetch()
    renderDetail()

    const seeSellerLink = await screen.findByText('See reviews')
    fireEvent.click(seeSellerLink)

    await waitFor(() => expect(screen.getByText('No reviews yet for this seller.')).toBeInTheDocument())
  })
})
