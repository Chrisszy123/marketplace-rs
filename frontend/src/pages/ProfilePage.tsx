import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const memberSince = new Date(user.member_since).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-bg text-xl font-semibold text-brand-dark-green">
            {user.display_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-brand-dark-green">{user.display_name}</h1>
            <p className="text-sm text-brand-dark/70">Member since {memberSince}</p>
          </div>
        </div>

        <dl className="mb-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-brand-dark/70">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-dark/70">Location</dt>
            <dd>{user.location ?? 'Not set'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-dark/70">Phone</dt>
            <dd>
              {user.phone_verified ? (
                <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-brand-green">
                  Verified
                </span>
              ) : (
                'Not verified'
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-dark/70">Rating</dt>
            <dd>{user.rating ?? 'No ratings yet'}</dd>
          </div>
        </dl>

        <Link
          to="/my-listings"
          className="mb-3 block w-full rounded-full bg-brand-green py-2 text-center font-medium text-white"
        >
          My listings
        </Link>

        <Link
          to="/messages"
          className="mb-3 block w-full rounded-full border border-brand-dark/20 py-2 text-center font-medium text-brand-dark"
        >
          Messages
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-full border border-brand-dark/20 py-2 font-medium text-brand-dark"
        >
          Log out
        </button>
      </div>
    </main>
  )
}
