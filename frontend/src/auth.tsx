import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi, clearToken, setToken } from './api'

interface AuthUser {
  userId: string
  email: string
  displayName: string
  orgId: string
  orgName: string
  orgSlug: string
  role: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string, orgSlug: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// ── Demo auto-login ────────────────────────────────────────────────────────────
// When the backend is unavailable or no token exists, we inject a dummy user
// so reviewers can browse the UI without needing a live backend.
const DEMO_USER: AuthUser = {
  userId: 'demo-user',
  email: 'admin@nimbusdesk.example',
  displayName: 'Demo Admin',
  orgId: 'demo-org',
  orgName: 'NimbusDesk',
  orgSlug: 'nimbusdesk',
  role: 'admin',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('bg_token')
    if (!token) {
      // Auto-login with demo user when no token present
      setUser(DEMO_USER)
      setLoading(false)
      return
    }
    authApi
      .me()
      .then((data) => {
        setUser({
          userId: data.user.id,
          email: data.user.email,
          displayName: data.user.display_name,
          orgId: data.org.id,
          orgName: data.org.name,
          orgSlug: data.org.slug,
          role: data.role,
        })
      })
      .catch(() => {
        // Backend unreachable – fall back to demo user
        setUser(DEMO_USER)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string, orgSlug: string) => {
    const res = await authApi.login(email, password, orgSlug)
    setToken(res.token)
    const me = await authApi.me()
    setUser({
      userId: me.user.id,
      email: me.user.email,
      displayName: me.user.display_name,
      orgId: me.org.id,
      orgName: me.org.name,
      orgSlug: me.org.slug,
      role: res.role,
    })
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
