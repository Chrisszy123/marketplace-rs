import { useEffect, useState } from 'react'
import { api, ApiRequestError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useAuthPrompt } from '../../context/AuthPromptContext'
import { PhoneIcon } from '../ui/icons'

interface ShowPhoneNumberButtonProps {
  sellerId: string
  className?: string
}

/**
 * Gated inline reveal: logged-out visitors hit the same login prompt as "Message seller"; once
 * authenticated (immediately, or after the prompt), the number is fetched and shown in place —
 * no navigation. `attempt` (rather than firing the fetch directly from the requireAuth callback)
 * is what makes this safe: the callback may run right after login resolves, before this
 * component has re-rendered with the fresh accessToken, so it only flips a counter — the actual
 * fetch lives in an effect that reads accessToken from the hook, guaranteed current by the time
 * it runs.
 */
export function ShowPhoneNumberButton({ sellerId, className = '' }: ShowPhoneNumberButtonProps) {
  const { accessToken } = useAuth()
  const { requireAuth } = useAuthPrompt()
  const [attempt, setAttempt] = useState(0)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (attempt === 0 || !accessToken || phoneNumber) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    api
      .getSellerProfile(sellerId, accessToken)
      .then((profile) => {
        if (!cancelled) setPhoneNumber(profile.phone_number)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : 'Failed to load phone number')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [attempt, accessToken, sellerId, phoneNumber])

  function handleClick() {
    if (error) {
      setError(null)
      setAttempt((a) => a + 1)
      return
    }
    requireAuth(() => setAttempt((a) => a + 1))
  }

  if (phoneNumber) {
    return (
      <a
        href={`tel:${phoneNumber}`}
        className={`flex items-center justify-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/5 py-3 text-body font-semibold text-brand-green outline-none transition hover:bg-brand-green/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${className}`}
      >
        <PhoneIcon className="h-5 w-5" />
        {phoneNumber}
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={`flex items-center justify-center gap-2 rounded-full border border-brand-dark/15 py-3 text-body font-semibold text-brand-dark outline-none transition hover:bg-brand-bg disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${className}`}
    >
      <PhoneIcon className="h-5 w-5" />
      {isLoading ? 'Loading number…' : error ? 'Try again' : 'Show phone number'}
    </button>
  )
}
