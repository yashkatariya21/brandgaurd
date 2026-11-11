import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi, setToken, clearToken, getToken } from './api'

/** Backend authentication; a tab retains its session across refresh. */

export interface AuthUser {
  userId: string
  email: string
  displayName: string
  role: string
  orgName: string
  orgId: string
  orgSlug: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string, orgSlug: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// ── Auth helpers ──────────────────────────────────────────────────────────────

function buildUser(me: Awaited<ReturnType<typeof authApi.me>>, role: string): AuthUser {
  return {
    userId: me.user.id,
    email: me.user.email,
    displayName: me.user.display_name,
    role,
    orgName: me.org.name,
    orgId: me.org.id,
    orgSlug: me.org.slug,
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    // Try to restore session from stored token
    authApi
      .me()
      .then((me) => setUser(buildUser(me, me.role)))
      .catch(() => { clearToken() })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string, orgSlug: string): Promise<void> => {
    const res = await authApi.login(email, password, orgSlug)
    setToken(res.token)
    try {
      const me = await authApi.me()
      setUser(buildUser(me, res.role))
    } catch (err) {
      clearToken()
      throw err
    }
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
