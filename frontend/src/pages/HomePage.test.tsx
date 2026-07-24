import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'
import { api } from '../api/client'

vi.mock('../api/client', () => ({
  api: { getCategories: vi.fn(), search: vi.fn() },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ status: 'unauthenticated', user: null }),
}))

describe('HomePage', () => {
  it('is the live browsable marketplace — renders listings with no session at all', async () => {
    vi.mocked(api.getCategories).mockResolvedValue([])
    vi.mocked(api.search).mockResolvedValue({
      items: [
        {
          id: 'listing-1',
          category_id: 'cat-1',
          listing_type: 'good',
          title: 'Toyota Camry 2018',
          price_kobo: 850_000_000,
          currency: 'NGN',
          location: 'Ikeja, Lagos',
          is_boosted: false,
          thumbnail_url: null,
        },
      ],
      next_cursor: null,
    })

    render(
      <MemoryRouter initialEntries={['/']}>
        <HomePage />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Toyota Camry 2018')).toBeInTheDocument())
  })
})
