import { Link } from 'react-router-dom'
import { ListingCard } from './ListingCard'

const PERKS = [
  'Top-of-search placement, ahead of free listings',
  'A featured badge on your profile and every listing',
  'More active listings at once (free tier is capped)',
  'Auto-renewal — no manual relisting every 30 days',
]

export function Subscription() {
  return (
    <section className="bg-brand-bg px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-2xl font-semibold text-brand-dark-green sm:text-3xl">
            Sell more with a boosted listing
          </h2>
          <p className="mx-auto max-w-xl text-brand-dark/70">
            Same listing, same price — subscribing just changes where buyers see it first.
          </p>
        </div>

        <div className="mb-10 flex flex-col items-center justify-center gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-brand-dark/50">
              Standard
            </span>
            <ListingCard
              title="iPhone 13 Pro — 128GB, Space Grey"
              priceKobo={45000000}
              currency="NGN"
              location="Lekki, Lagos"
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-brand-dark-green">
              Boosted
            </span>
            <ListingCard
              title="iPhone 13 Pro — 128GB, Space Grey"
              priceKobo={45000000}
              currency="NGN"
              location="Lekki, Lagos"
              boosted
            />
          </div>
        </div>

        <div className="mx-auto max-w-md">
          <ul className="mb-6 space-y-2">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-2 text-sm text-brand-dark">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                {perk}
              </li>
            ))}
          </ul>
          <div className="text-center">
            <Link
              to="/signup"
              className="inline-block rounded-full bg-brand-green px-6 py-3 text-sm font-medium text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
            >
              Start selling
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
