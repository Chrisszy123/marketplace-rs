import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-brand-dark-green px-10 py-10 text-white sm:flex">
        <Link to="/" className="text-h3 font-semibold">
          Marketplace
        </Link>
        <div>
          <p className="text-display max-w-sm text-balance text-white">
            Buy it, sell it, right in your city.
          </p>
          <p className="mt-4 max-w-sm text-body text-white/60">
            Electronics, cars, property, fashion, jobs, services and more — search what's
            nearby, message the seller directly, and sort out the rest between yourselves.
          </p>
        </div>
        <p className="text-caption text-white/40">© {new Date().getFullYear()} Marketplace</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-brand-bg px-4 py-10">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 block text-h3 font-semibold text-brand-dark-green sm:hidden"
          >
            Marketplace
          </Link>
          <h1 className="text-h1 text-brand-dark-green">{title}</h1>
          {subtitle && <p className="mt-1.5 text-body-sm text-brand-dark/60">{subtitle}</p>}
          <div className="mt-6 rounded-3xl bg-white p-6 shadow-card sm:p-8">{children}</div>
          {footer && <div className="mt-5 text-center text-body-sm text-brand-dark/70">{footer}</div>}
        </div>
      </div>
    </main>
  )
}
