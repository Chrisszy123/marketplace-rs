import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'
import { api } from '../api/client'
import type { Category } from '../api/types'

vi.mock('../api/client', () => ({
  api: { getCategories: vi.fn() },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ status: 'unauthenticated' }),
}))

const categories: Category[] = [
  { id: 'top-vehicles', parent_id: null, name: 'Vehicles', slug: 'vehicles' },
  { id: 'sub-cars', parent_id: 'top-vehicles', name: 'Cars', slug: 'vehicles-cars' },
]

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

    renderHome()

    await waitFor(() => expect(screen.getByText('Vehicles')).toBeInTheDocument())
    expect(screen.queryByText('Cars')).not.toBeInTheDocument()
  })

  it('navigates to the search page on submitting the search bar', async () => {
    vi.mocked(api.getCategories).mockResolvedValue([])

    renderHome()

    fireEvent.change(screen.getByPlaceholderText('Search for anything…'), {
      target: { value: 'Camry' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => expect(screen.getByText('Search page reached')).toBeInTheDocument())
  })
})
