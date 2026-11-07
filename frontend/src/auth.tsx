import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  ensureSeedUser,
  registerUser,
  loginUser,
  getSessionUser,
  setSession,
  clearSession,
  type LocalUser,
} from './lib/localUsers'

/**
 * Auth — local-first authentication.
 * Users live in the browser (see lib/localUsers.ts). Login & registration
 * happen entirely client-side; no backend is required to use the app.
 *
 * AuthUser keeps the fields the feature pages already read (displayName,
 * role, orgName) so existing pages work unchanged.
 */
export interface AuthUser {
  userId: string
  displayName: string
  phone: string
  role: string
  orgName: string
  orgId: string
  orgSlug: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (name: string, phone: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function toAuthUser(u: LocalUser): AuthUser {
  return {
    userId: u.id,
    displayName: u.name,
    phone: u.phone,
    role: 'admin',
    orgName: 'Local Workspace',
    orgId: 'local',
    orgSlug: 'local',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ensureSeedUser()
    const session = getSessionUser()
    if (session) setUser(toAuthUser(session))
    setLoading(false)
  }, [])

  const login = async (phone: string, password: string) => {
    const res = loginUser(phone, password)
    if (!res.ok || !res.user) throw new Error(res.error ?? 'Login failed')
    setSession(res.user.id)
    setUser(toAuthUser(res.user))
  }

  const register = async (name: string, phone: string, password: string) => {
    const res = registerUser(name, phone, password)
    if (!res.ok || !res.user) throw new Error(res.error ?? 'Registration failed')
    setSession(res.user.id)
    setUser(toAuthUser(res.user))
  }

  const logout = () => {
    clearSession()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
