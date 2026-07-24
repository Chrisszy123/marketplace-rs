import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { UserProfile } from '../api/types'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  user: UserProfile | null
  accessToken: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<UserProfile | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  async function loadSession(token: string) {
    const profile = await api.getMe(token)
    setAccessToken(token)
    setUser(profile)
    setStatus('authenticated')
  }

  useEffect(() => {
    // On load, try the httpOnly refresh cookie so an existing session survives a page reload.
    api
      .refresh()
      .then((res) => loadSession(res.access_token))
      .catch(() => setStatus('unauthenticated'))
  }, [])

  async function login(email: string, password: string) {
    const res = await api.login({ email, password })
    await loadSession(res.access_token)
  }

  async function logout() {
    await api.logout()
    setAccessToken(null)
    setUser(null)
    setStatus('unauthenticated')
  }

  return (
    <AuthContext.Provider value={{ status, user, accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
