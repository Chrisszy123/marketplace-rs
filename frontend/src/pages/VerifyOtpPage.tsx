import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api, ApiRequestError } from '../api/client'

interface LocationState {
  userId?: string
  phoneNumber?: string
}

export function VerifyOtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userId, phoneNumber } = (location.state as LocationState) ?? {}

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!userId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-bg px-4 text-center">
        <div>
          <p className="mb-4 text-brand-dark">
            Nothing to verify yet — start by creating an account.
          </p>
          <Link to="/signup" className="font-medium text-brand-green">
            Go to signup
          </Link>
        </div>
      </main>
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await api.verifyOtp({ user_id: userId as string, code })
      navigate('/login', { state: { verified: true } })
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
        <h1 className="mb-2 text-2xl font-semibold text-brand-dark-green">Verify your phone</h1>
        <p className="mb-6 text-sm text-brand-dark/70">
          Enter the 6-digit code sent to {phoneNumber ?? 'your phone'}. In dev, check the
          backend log — no real SMS is sent yet.
        </p>

        <label className="mb-4 block text-sm">
          Verification code
          <input
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full rounded-lg border border-brand-dark/20 px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-brand-green"
          />
        </label>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-brand-green py-2 font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </main>
  )
}
