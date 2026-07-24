import type { ReactNode } from 'react'
import { BottomNav } from '../ui/BottomNav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="pb-20">{children}</div>
      <BottomNav />
    </div>
  )
}
