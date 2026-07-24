import { createContext, useContext, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ApiRequestError } from '../api/client'
import { BottomSheet } from '../components/ui/BottomSheet'
import { TextField } from '../components/ui/Field'
import { useAuth } from './AuthContext'

interface AuthPromptContextValue {
  /** Runs `onAuthenticated` now if there's a session, otherwise prompts login and runs it after. */
  requireAuth: (onAuthenticated: () => void) => void
}

const AuthPromptContext = createContext<AuthPromptContextValue | undefined>(undefined)

export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const { status, login } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const pendingAction = useRef<(() => void) | null>(null)

  function requireAuth(onAuthenticated: () => void) {
    if (status === 'authenticated') {
      onAuthenticated()
      return
    }
    pendingAction.current = onAuthenticated
    setError(null)
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
    pendingAction.current = null
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      setEmail('')
      setPassword('')
      setIsOpen(false)
      const action = pendingAction.current
      pendingAction.current = null
      action?.()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPromptContext.Provider value={{ requireAuth }}>
      {children}
      <BottomSheet open={isOpen} onClose={close} title="Log in to continue">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <TextField
              label="Email"
              id="auth-prompt-email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              id="auth-prompt-password"
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="mt-3 text-body-sm text-brand-error">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 w-full rounded-full bg-brand-green py-2.5 text-body-sm font-semibold text-white outline-none transition disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
          >
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </button>

          <p className="mt-4 text-center text-body-sm text-brand-dark/60">
            New here?{' '}
            <Link to="/signup" onClick={close} className="font-semibold text-brand-green">
              Sign up
            </Link>
          </p>
        </form>
      </BottomSheet>
    </AuthPromptContext.Provider>
  )
}

export function useAuthPrompt() {
  const ctx = useContext(AuthPromptContext)
  if (!ctx) throw new Error('useAuthPrompt must be used within an AuthPromptProvider')
  return ctx
}
