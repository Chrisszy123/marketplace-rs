import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiRequestError } from '../api/client'

export function SignupPage() {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const res = await api.signup({
        display_name: displayName,
        email,
        phone_number: phoneNumber,
        password,
      })
      navigate('/verify', { state: { userId: res.user_id, phoneNumber } })
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
        <h1 className="mb-6 text-2xl font-semibold text-brand-dark-green">Create your account</h1>

        <label className="mb-3 block text-sm">
          Full name
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 outline-none focus:border-brand-green"
          />
        </label>

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

        <label className="mb-3 block text-sm">
          Phone number
          <input
            required
            placeholder="+2348012345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 outline-none focus:border-brand-green"
          />
        </label>

        <label className="mb-4 block text-sm">
          Password
          <input
            required
            type="password"
            minLength={8}
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
          {isSubmitting ? 'Creating account…' : 'Sign up'}
        </button>

        <p className="mt-4 text-center text-sm text-brand-dark/70">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-green">
            Log in
          </Link>
        </p>
      </form>
    </main>
  )
}
