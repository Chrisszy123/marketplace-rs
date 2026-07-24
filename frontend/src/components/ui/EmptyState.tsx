import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface EmptyStateAction {
  label: string
  to?: string
  onClick?: () => void
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  body: string
  action?: EmptyStateAction
  className?: string
}

export function EmptyState({ icon, title, body, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-12 text-center shadow-card ${className}`}
    >
      {icon && <div className="text-brand-green/70">{icon}</div>}
      <div>
        <p className="text-h3 text-brand-dark-green">{title}</p>
        <p className="mx-auto mt-1 max-w-xs text-body-sm text-brand-dark/65">{body}</p>
      </div>
      {action &&
        (action.to ? (
          <Link
            to={action.to}
            className="mt-2 rounded-full bg-brand-green px-5 py-2 text-body-sm font-semibold text-white outline-none transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 rounded-full bg-brand-green px-5 py-2 text-body-sm font-semibold text-white outline-none transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
          >
            {action.label}
          </button>
        ))}
    </div>
  )
}
