import { createContext, useContext, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BottomSheet } from '../components/ui/BottomSheet'
import { SellFlow } from '../components/sell/SellFlow'
import { useAuth } from './AuthContext'

interface SellSheetContextValue {
  openSell: (draftId?: string) => void
}

const SellSheetContext = createContext<SellSheetContextValue | undefined>(undefined)

export function SellSheetProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [draftId, setDraftId] = useState<string | undefined>(undefined)
  const [sheetKey, setSheetKey] = useState(0)

  function openSell(id?: string) {
    setDraftId(id)
    setSheetKey((k) => k + 1)
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
  }

  return (
    <SellSheetContext.Provider value={{ openSell }}>
      {children}
      <BottomSheet open={isOpen} onClose={close} title={status === 'authenticated' ? 'Sell something' : 'Log in to sell'}>
        {status === 'authenticated' ? (
          <SellFlow key={sheetKey} draftId={draftId} onDone={close} />
        ) : (
          <div className="py-2 text-center">
            <p className="mb-5 text-body text-brand-dark/70">
              Create a free account to post a listing — it only takes a minute.
            </p>
            <Link
              to="/signup"
              onClick={close}
              className="mb-2.5 block rounded-full bg-brand-green py-2.5 text-center text-body-sm font-semibold text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark-green"
            >
              Sign up
            </Link>
            <Link
              to="/login"
              onClick={close}
              className="block rounded-full border border-brand-dark/15 py-2.5 text-center text-body-sm font-semibold text-brand-dark outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
            >
              Log in
            </Link>
          </div>
        )}
      </BottomSheet>
    </SellSheetContext.Provider>
  )
}

export function useSellSheet() {
  const ctx = useContext(SellSheetContext)
  if (!ctx) throw new Error('useSellSheet must be used within a SellSheetProvider')
  return ctx
}
