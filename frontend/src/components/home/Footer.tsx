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
    heading: 'Selling',
    links: [
      { label: 'Post a listing', to: '/signup' },
      { label: 'Subscription plans', to: '/signup' },
    ],
  },
]

export function Footer() {
  return (
    <>
      <section className="bg-brand-cream px-4 py-16 text-center">
        <h2 className="mb-3 text-2xl font-semibold text-brand-dark-green sm:text-3xl">
          Ready to buy or sell something today?
        </h2>
        <p className="mx-auto mb-6 max-w-md text-brand-dark/70">
          Join buyers and sellers already trading on Marketplace — it's free to get started.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/signup"
            className="rounded-full bg-brand-green px-6 py-3 text-sm font-medium text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
          >
            Sign up
          </Link>
          <Link
            to="/search"
            className="rounded-full border border-brand-dark-green/20 px-6 py-3 text-sm font-medium text-brand-dark-green outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
          >
            Browse listings
          </Link>
        </div>
      </section>

      <footer className="bg-brand-forest px-4 py-10 text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-white">Marketplace</p>
            <p className="mt-1 max-w-xs text-sm">
              Buy and sell anything, locally — a connection layer for everyday trade.
            </p>
          </div>
          <div className="flex flex-wrap gap-12">
            {LINK_GROUPS.map((group) => (
              <div key={group.heading}>
                <p className="mb-2 text-sm font-medium text-white">{group.heading}</p>
                <ul className="space-y-1">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-sm outline-none hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-boosted"
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
        <p className="mx-auto mt-8 max-w-6xl text-xs text-white/40">
          © {new Date().getFullYear()} Marketplace. All rights reserved.
        </p>
      </footer>
    </>
  )
}
