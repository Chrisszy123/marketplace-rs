import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SearchResultsPage } from './SearchResultsPage'
import { api } from '../api/client'

vi.mock('../api/client', () => ({
  api: { getCategories: vi.fn(), search: vi.fn() },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ status: 'unauthenticated', user: null }),
}))

describe('SearchResultsPage', () => {
  it('renders the shared browse layout at /search', async () => {
    vi.mocked(api.getCategories).mockResolvedValue([])
    vi.mocked(api.search).mockResolvedValue({
      items: [
        {
          id: 'listing-1',
          category_id: 'cat-1',
          listing_type: 'good',
          title: 'Sofa set',
          price_kobo: 12_000_000,
          currency: 'NGN',
          location: 'Abuja',
          is_boosted: false,
          thumbnail_url: null,
        },
      ],
      next_cursor: null,
    })

    render(
      <MemoryRouter initialEntries={['/search?q=sofa']}>
        <SearchResultsPage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Sofa set')).toBeInTheDocument())
    expect(api.search).toHaveBeenCalledWith(expect.objectContaining({ q: 'sofa' }))
  })
})
