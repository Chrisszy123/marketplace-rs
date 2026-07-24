import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import { LoginPage } from './LoginPage'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<p>Profile page reached</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('logs in and navigates to the profile on success', async () => {
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
            json: () => Promise.resolve({ access_token: 'token-abc', user_id: 'user-1' }),
          })
        }
        if (url.includes('/users/me')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                id: 'user-1',
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
        return Promise.reject(new Error(`unexpected fetch to ${url}`))
      }),
    )

    renderLogin()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => expect(screen.getByText('Profile page reached')).toBeInTheDocument())
  })

  it('shows an error message when the phone has not been verified', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/auth/refresh')) {
          return Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) })
        }
        if (url.includes('/auth/login') && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 403,
            json: () =>
              Promise.resolve({
                error: 'phone number not verified, complete OTP verification first',
              }),
          })
        }
        return Promise.reject(new Error(`unexpected fetch to ${url}`))
      }),
    )

    renderLogin()

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() =>
      expect(
        screen.getByText('phone number not verified, complete OTP verification first'),
      ).toBeInTheDocument(),
    )
  })
})
