import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return <p className="p-8 text-center text-brand-dark">Loading…</p>
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
