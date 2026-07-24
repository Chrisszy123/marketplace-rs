import { NavLink } from 'react-router-dom'
import { useSellSheet } from '../../context/SellSheetContext'
import { HomeIcon, MessagesIcon, PersonIcon, PlusIcon, SearchIcon } from './navIcons'

function NavItem({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${
          isActive ? 'text-brand-green' : 'text-brand-dark/45'
        }`
      }
    >
      <span className="h-5 w-5">{icon}</span>
      {label}
    </NavLink>
  )
}

export function BottomNav() {
  const { openSell } = useSellSheet()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-dark/10 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 pb-[max(env(safe-area-inset-bottom),0px)]">
        <NavItem to="/" label="Home" icon={<HomeIcon />} />
        <NavItem to="/search" label="Search" icon={<SearchIcon />} />
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => openSell()}
            aria-label="Sell something"
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-white shadow-lg outline-none transition hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
          >
            <PlusIcon className="h-6 w-6" />
          </button>
          <span className="mt-1 pb-2 text-[10px] font-semibold text-brand-green">Sell</span>
        </div>
        <NavItem to="/messages" label="Messages" icon={<MessagesIcon />} />
        <NavItem to="/profile" label="You" icon={<PersonIcon />} />
      </div>
    </nav>
  )
}
