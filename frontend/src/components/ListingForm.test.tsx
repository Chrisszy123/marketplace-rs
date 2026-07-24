import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ListingForm } from './ListingForm'
import { api } from '../api/client'
import type { Category } from '../api/types'

vi.mock('../api/client', () => ({
  api: { getCategories: vi.fn() },
  ApiRequestError: class ApiRequestError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
}))

const categories: Category[] = [
  { id: 'top-electronics', parent_id: null, name: 'Electronics', slug: 'electronics' },
  {
    id: 'sub-phones',
    parent_id: 'top-electronics',
    name: 'Mobile Phones',
    slug: 'electronics-mobile-phones',
  },
]

describe('ListingForm', () => {
  it('submits a "good" listing with price converted to kobo', async () => {
    vi.mocked(api.getCategories).mockResolvedValue(categories)
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<ListingForm submitLabel="Publish listing" onSubmit={onSubmit} />)

    await waitFor(() => expect(screen.getByText('Electronics')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'top-electronics' } })
    await waitFor(() => expect(screen.getByLabelText('Subcategory')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Subcategory'), { target: { value: 'sub-phones' } })

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'iPhone 13' } })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Good condition, barely used.' },
    })
    fireEvent.change(screen.getByLabelText('Price (₦)'), { target: { value: '450000' } })
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Lagos' } })

    fireEvent.click(screen.getByRole('button', { name: 'Publish listing' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        category_id: 'sub-phones',
        listing_type: 'good',
        title: 'iPhone 13',
        description: 'Good condition, barely used.',
        price_kobo: 45_000_000,
        location: 'Lagos',
        condition: 'used',
      }),
    )
  })

  it('switches to service fields and requires a service_area instead of condition', async () => {
    vi.mocked(api.getCategories).mockResolvedValue(categories)
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<ListingForm submitLabel="Publish listing" onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('button', { name: /offering a service/i }))

    expect(screen.queryByText('Condition')).not.toBeInTheDocument()
    expect(screen.getByText('Service area')).toBeInTheDocument()
  })
})
