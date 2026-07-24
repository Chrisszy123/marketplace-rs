import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchResultsPage } from './SearchResultsPage'
import { api } from '../api/client'
import type { SearchHit } from '../api/types'

vi.mock('../api/client', () => ({
  api: { getCategories: vi.fn(), search: vi.fn() },
  ApiRequestError: class ApiRequestError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

function makeHit(overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    id: 'listing-1',
    category_id: 'cat-1',
    listing_type: 'good',
    title: 'iPhone 13',
    price_kobo: 45_000_000,
    currency: 'NGN',
    location: 'Lagos',
    is_boosted: false,
    thumbnail_url: null,
    ...overrides,
  }
}

// jsdom has no IntersectionObserver; stub one that fires immediately so infinite-scroll code
// paths run deterministically in tests instead of needing real scroll geometry.
class ImmediateIntersectionObserver {
  callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }
  observe() {
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as never)
  }
  disconnect() {}
  unobserve() {}
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', ImmediateIntersectionObserver)
  vi.mocked(api.getCategories).mockResolvedValue([])
})

function renderPage(initialPath = '/search') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SearchResultsPage />
    </MemoryRouter>,
  )
}

describe('SearchResultsPage', () => {
  it('renders results and labels boosted listings as Top Ad', async () => {
    vi.mocked(api.search).mockResolvedValue({
      items: [makeHit({ is_boosted: true }), makeHit({ id: 'listing-2', title: 'Sofa set' })],
      next_cursor: null,
    })

    renderPage()

    await waitFor(() => expect(screen.getByText('iPhone 13')).toBeInTheDocument())
    expect(screen.getByText('Sofa set')).toBeInTheDocument()
    expect(screen.getByText('Top Ad')).toBeInTheDocument()
  })

  it('shows an empty state when there are no results', async () => {
    vi.mocked(api.search).mockResolvedValue({ items: [], next_cursor: null })

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('No listings match your search.')).toBeInTheDocument(),
    )
  })

  it('passes the q param from the URL through to the search call', async () => {
    vi.mocked(api.search).mockResolvedValue({ items: [], next_cursor: null })

    renderPage('/search?q=Camry')

    await waitFor(() =>
      expect(api.search).toHaveBeenCalledWith(expect.objectContaining({ q: 'Camry' })),
    )
  })

  it('auto-loads the next page via infinite scroll and appends results', async () => {
    vi.mocked(api.search)
      .mockResolvedValueOnce({
        items: [makeHit({ id: 'listing-1', title: 'First' })],
        next_cursor: 'cursor-abc',
      })
      .mockResolvedValueOnce({
        items: [makeHit({ id: 'listing-2', title: 'Second' })],
        next_cursor: null,
      })

    renderPage()

    await waitFor(() => expect(screen.getByText('First')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('Second')).toBeInTheDocument())
    expect(api.search).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'cursor-abc' }))
  })
})
