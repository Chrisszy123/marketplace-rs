import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function HomePage() {
  const { status } = useAuth()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-bg px-4 text-center">
      <h1 className="text-3xl font-semibold text-brand-dark-green">Marketplace</h1>
      <p className="text-brand-dark">Placeholder wordmark — real logo mark pending.</p>
      <div className="flex gap-3">
        {status === 'authenticated' ? (
          <Link
            to="/profile"
            className="rounded-full bg-brand-green px-4 py-2 font-medium text-white"
          >
            Go to profile
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="rounded-full border border-brand-dark/20 px-4 py-2 font-medium text-brand-dark"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-brand-green px-4 py-2 font-medium text-white"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
