import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
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
      <AuthLayout title="Nothing to verify yet">
        <p className="mb-4 text-body text-brand-dark/70">Start by creating an account.</p>
        <Link
          to="/signup"
          className="block w-full rounded-full bg-brand-green py-3 text-center text-body font-semibold text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
        >
          Go to signup
        </Link>
      </AuthLayout>
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
    <AuthLayout
      title="Verify your phone"
      subtitle={`Enter the 6-digit code sent to ${phoneNumber ?? 'your phone'}. In dev, check the backend log — no real SMS is sent yet.`}
    >
      <form onSubmit={handleSubmit}>
        <label htmlFor="otp-code" className="block text-body-sm font-medium text-brand-dark">
          Verification code
          <input
            id="otp-code"
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-brand-dark/15 bg-white px-3.5 py-3 text-center text-h2 tracking-[0.4em] text-brand-dark outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/15"
          />
        </label>

        {error && <p className="mt-4 text-body-sm text-brand-error">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-full bg-brand-green py-3 text-body font-semibold text-white outline-none transition hover:brightness-95 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
        >
          {isSubmitting ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </AuthLayout>
  )
}
