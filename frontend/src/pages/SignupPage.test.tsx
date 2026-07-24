import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { SignupPage } from './SignupPage'

function renderSignup() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify" element={<div>Verify page reached</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SignupPage', () => {
  it('submits the form and navigates to verification on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ user_id: 'user-123', message: 'verification code sent' }),
      }),
    )

    renderSignup()

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ada Lovelace' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+2348012345678' },
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => expect(screen.getByText('Verify page reached')).toBeInTheDocument())
  })

  it('shows the server error message when signup fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({ error: 'an account with that email or phone number already exists' }),
      }),
    )

    renderSignup()

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ada Lovelace' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText('Phone number'), {
      target: { value: '+2348012345678' },
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() =>
      expect(
        screen.getByText('an account with that email or phone number already exists'),
      ).toBeInTheDocument(),
    )
  })
})
