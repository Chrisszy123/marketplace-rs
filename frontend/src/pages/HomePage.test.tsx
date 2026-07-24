import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'
import { api } from '../api/client'
import type { SearchHit } from '../api/types'

vi.mock('../api/client', () => ({
  api: { getCategories: vi.fn(), search: vi.fn() },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ status: 'unauthenticated', user: null }),
}))

function makeHit(overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    id: 'listing-1',
    category_id: 'cat-1',
    listing_type: 'good',
    title: 'Toyota Camry 2018',
    price_kobo: 850_000_000,
    currency: 'NGN',
    location: 'Ikeja, Lagos',
    is_boosted: false,
    thumbnail_url: null,
    ...overrides,
  }
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  it('is the live browsable marketplace — renders listings with no session at all', async () => {
    vi.mocked(api.getCategories).mockResolvedValue([])
    vi.mocked(api.search).mockResolvedValue({ items: [makeHit()], next_cursor: null })

    renderHome()

    await waitFor(() => expect(screen.getByText('Toyota Camry 2018')).toBeInTheDocument())
  })

  it('shows the featured carousel when boosted listings exist', async () => {
    vi.mocked(api.getCategories).mockResolvedValue([])
    vi.mocked(api.search).mockResolvedValue({
      items: [makeHit({ is_boosted: true })],
      next_cursor: null,
    })

    renderHome()

    await waitFor(() => expect(screen.getByText('Boosted listings right now')).toBeInTheDocument())
  })

  it('falls back to newest listings, honestly relabeled, when nothing is boosted yet', async () => {
    vi.mocked(api.getCategories).mockResolvedValue([])
    vi.mocked(api.search).mockResolvedValue({ items: [makeHit()], next_cursor: null })

    renderHome()

    await waitFor(() => expect(screen.getByText('Just listed on Marketplace')).toBeInTheDocument())
    expect(screen.queryByText('Boosted listings right now')).not.toBeInTheDocument()
  })

  it('skips the featured section entirely when there are no listings at all', async () => {
    vi.mocked(api.getCategories).mockResolvedValue([])
    vi.mocked(api.search).mockResolvedValue({ items: [], next_cursor: null })

    renderHome()

    await waitFor(() => expect(screen.getByText('Nothing here yet.')).toBeInTheDocument())
    expect(screen.queryByText('Just listed on Marketplace')).not.toBeInTheDocument()
    expect(screen.queryByText('Boosted listings right now')).not.toBeInTheDocument()
  })

  it('renders the FAQ section and footer', async () => {
    vi.mocked(api.getCategories).mockResolvedValue([])
    vi.mocked(api.search).mockResolvedValue({ items: [], next_cursor: null })

    renderHome()

    await waitFor(() =>
      expect(screen.getByText('Frequently asked questions')).toBeInTheDocument(),
    )
    expect(screen.getByText('Is Marketplace free to use?')).toBeInTheDocument()
    expect(screen.getByText('© ' + new Date().getFullYear() + ' Marketplace. All rights reserved.')).toBeInTheDocument()
  })
})
