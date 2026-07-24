import { useNavigate, useSearchParams } from 'react-router-dom'
import { BuyingTab } from '../components/profile/BuyingTab'
import { SellingTab } from '../components/profile/SellingTab'
import { useAuth } from '../context/AuthContext'

type ProfileTab = 'selling' | 'buying'

export function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: ProfileTab = searchParams.get('tab') === 'buying' ? 'buying' : 'selling'

  if (!user) return null

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const memberSince = new Date(user.member_since).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
  })

  function setTab(next: ProfileTab) {
    setSearchParams({ tab: next })
  }

  return (
    <main className="min-h-screen bg-brand-bg px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-4 rounded-2xl bg-white p-5 shadow-card">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-bg text-xl font-semibold text-brand-dark-green">
            {user.display_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-h2 text-brand-dark-green">{user.display_name}</h1>
            <p className="text-body-sm text-brand-dark/60">
              Member since {memberSince}
              {user.phone_verified && <span className="ml-2 text-brand-green">· Verified</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 text-caption font-semibold text-brand-dark/50 outline-none hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
          >
            Log out
          </button>
        </div>

        <div className="mb-6 flex gap-1 rounded-full bg-white p-1 shadow-card">
          {(['selling', 'buying'] as ProfileTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full py-2 text-body-sm font-semibold capitalize outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${
                tab === t ? 'bg-brand-green text-white' : 'text-brand-dark/60'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'selling' ? <SellingTab /> : <BuyingTab />}
      </div>
    </main>
  )
}
