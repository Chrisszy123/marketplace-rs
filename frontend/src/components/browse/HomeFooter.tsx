import { Link } from 'react-router-dom'

const LINK_GROUPS = [
  {
    heading: 'Marketplace',
    links: [
      { label: 'Browse listings', to: '/search' },
      { label: 'Sign up', to: '/signup' },
      { label: 'Log in', to: '/login' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Your listings', to: '/profile?tab=selling' },
      { label: 'Saved listings', to: '/profile?tab=buying' },
      { label: 'Messages', to: '/messages' },
    ],
  },
]

export function HomeFooter() {
  return (
    <footer className="bg-brand-forest px-4 py-10 text-white/70 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
        <div>
          <p className="text-h3 font-semibold text-white">Marketplace</p>
          <p className="mt-1 max-w-xs text-body-sm">
            Buy and sell anything, locally — a connection layer for everyday trade.
          </p>
        </div>
        <div className="flex flex-wrap gap-10 sm:gap-12">
          {LINK_GROUPS.map((group) => (
            <div key={group.heading}>
              <p className="mb-2 text-body-sm font-semibold text-white">{group.heading}</p>
              <ul className="space-y-1.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-body-sm outline-none hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-boosted"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-8 text-caption text-white/40">© {new Date().getFullYear()} Marketplace. All rights reserved.</p>
    </footer>
  )
}
