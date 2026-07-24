import { useEffect, useRef, useState } from 'react'
import { PhoneIcon } from '../ui/icons'
import type { SellerProfile } from '../../api/types'

interface CallButtonProps {
  sellerProfile: SellerProfile | null
  isLoading: boolean
  error: string | null
}

/** Top-right header action: reveals the seller's phone number in a popover on click. */
export function CallButton({ sellerProfile, isLoading, error }: CallButtonProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Call seller"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-brand-green outline-none transition hover:bg-brand-green/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
      >
        <PhoneIcon className="h-5 w-5" />
      </button>

      {open && (
        <div className="animate-fade-in absolute right-0 top-11 z-20 w-60 rounded-2xl bg-white p-3.5 shadow-card">
          {isLoading && <p className="text-body-sm text-brand-dark/55">Loading number…</p>}
          {!isLoading && error && <p className="text-body-sm text-brand-error">Couldn't load phone number.</p>}
          {!isLoading && !error && sellerProfile && (
            <>
              <p className="text-caption text-brand-dark/50">{sellerProfile.display_name}'s phone number</p>
              <p className="mt-0.5 text-body font-semibold text-brand-dark">{sellerProfile.phone_number}</p>
              <a
                href={`tel:${sellerProfile.phone_number}`}
                className="mt-2.5 block rounded-full bg-brand-green py-1.5 text-center text-body-sm font-semibold text-white outline-none transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
              >
                Call now
              </a>
            </>
          )}
        </div>
      )}
    </div>
  )
}
