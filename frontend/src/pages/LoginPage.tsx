import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiRequestError } from '../api/client'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const justVerified = Boolean((location.state as { verified?: boolean } | null)?.verified)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate('/profile')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm"
      >
        <h1 className="mb-2 text-2xl font-semibold text-brand-dark-green">Log in</h1>
        {justVerified && (
          <p className="mb-4 rounded-lg bg-brand-bg px-3 py-2 text-sm text-brand-dark-green">
            Phone verified — you can log in now.
          </p>
        )}

        <label className="mb-3 block text-sm">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 outline-none focus:border-brand-green"
          />
        </label>

        <label className="mb-4 block text-sm">
          Password
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 outline-none focus:border-brand-green"
          />
        </label>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-brand-green py-2 font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>

        <p className="mt-4 text-center text-sm text-brand-dark/70">
          New here?{' '}
          <Link to="/signup" className="font-medium text-brand-green">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  )
}
