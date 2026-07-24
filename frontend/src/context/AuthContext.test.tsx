import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

function StatusProbe() {
  const { status, user } = useAuth()
  return <p>status: {status}{user ? ` (${user.display_name})` : ''}</p>
}

describe('AuthProvider', () => {
  it('becomes unauthenticated when the silent refresh has no valid session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'invalid credentials' }),
      }),
    )

    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>,
    )

    expect(screen.getByText(/status: loading/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/status: unauthenticated/)).toBeInTheDocument())
  })

  it('becomes authenticated when the silent refresh succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/auth/refresh')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ access_token: 'token-abc' }),
          })
        }
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
      }),
    )

    render(
      <AuthProvider>
        <StatusProbe />
      </AuthProvider>,
    )

    await waitFor(() =>
      expect(screen.getByText(/status: authenticated \(Ada Lovelace\)/)).toBeInTheDocument(),
    )
  })
})
