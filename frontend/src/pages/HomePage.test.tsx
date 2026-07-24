import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'
import { api } from '../api/client'
import type { Category, SearchHit } from '../api/types'

vi.mock('../api/client', () => ({
  api: { getCategories: vi.fn(), search: vi.fn() },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ status: 'unauthenticated' }),
}))

const categories: Category[] = [
  { id: 'top-vehicles', parent_id: null, name: 'Vehicles', slug: 'vehicles' },
  { id: 'sub-cars', parent_id: 'top-vehicles', name: 'Cars', slug: 'vehicles-cars' },
]

const emptySearch = { items: [], next_cursor: null }

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<p>Search page reached</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  it('renders only top-level categories as tiles', async () => {
    vi.mocked(api.getCategories).mockResolvedValue(categories)
    vi.mocked(api.search).mockResolvedValue(emptySearch)

    renderHome()

    await waitFor(() => expect(screen.getByText('Vehicles')).toBeInTheDocument())
    expect(screen.queryByText('Cars')).not.toBeInTheDocument()
  })

  it('navigates to the search page on submitting the search bar', async () => {
    vi.mocked(api.getCategories).mockResolvedValue([])
    vi.mocked(api.search).mockResolvedValue(emptySearch)

    renderHome()

    fireEvent.change(screen.getByPlaceholderText('Search for anything…'), {
      target: { value: 'Camry' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => expect(screen.getByText('Search page reached')).toBeInTheDocument())
  })

  it('links a category tile to its filtered search results', async () => {
    vi.mocked(api.getCategories).mockResolvedValue(categories)
    vi.mocked(api.search).mockResolvedValue(emptySearch)

    renderHome()

    const tile = await screen.findByText('Vehicles')
    expect(tile.closest('a')).toHaveAttribute('href', '/search?category_id=top-vehicles')
  })

  it('skips the live listings ticker when there is nothing to show', async () => {
    vi.mocked(api.getCategories).mockResolvedValue([])
    vi.mocked(api.search).mockResolvedValue(emptySearch)

    renderHome()

    await waitFor(() => expect(api.search).toHaveBeenCalled())
    expect(screen.queryByText('Just listed on Marketplace')).not.toBeInTheDocument()
  })

  it('shows recently listed items in the ticker when search returns results', async () => {
    vi.mocked(api.getCategories).mockResolvedValue([])
    const hit: SearchHit = {
      id: 'listing-1',
      category_id: 'top-vehicles',
      listing_type: 'good',
      title: 'Toyota Camry 2018',
      price_kobo: 850000000,
      currency: 'NGN',
      location: 'Ikeja, Lagos',
      is_boosted: true,
      thumbnail_url: null,
    }
    vi.mocked(api.search).mockResolvedValue({ items: [hit], next_cursor: null })

    renderHome()

    await waitFor(() =>
      expect(screen.getByText('Just listed on Marketplace')).toBeInTheDocument(),
    )
    const list = screen.getByRole('list', { name: 'Recently listed items' })
    expect(within(list).getAllByText('Toyota Camry 2018').length).toBeGreaterThan(0)
  })
})
