import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi, setToken, clearToken, getToken } from './api'

/**
 * auth.tsx — backend-based authentication.
 *
 * On load: if a token exists, call /v1/me to restore the session.
 *          If the backend is unreachable OR returns 401, clear the token and
 *          show the login page (never loop redirect).
 * login(): POST /v1/auth/login → store token → GET /v1/me → hydrate AuthUser.
 * logout(): clear token + state.
 */

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    // Restore session from stored token
    authApi
      .me()
      .then((me) => setUser(buildUser(me, me.role)))
      .catch(() => {
        // Token expired, revoked, or backend unreachable — clear and show login
        clearToken()
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string, orgSlug: string): Promise<void> => {
    // This can throw — callers handle the error message
    const res = await authApi.login(email, password, orgSlug)
    setToken(res.token)
    try {
      const me = await authApi.me()
      setUser(buildUser(me, res.role))
    } catch {
      // me() failed after login — use the role from the login response
      setUser({
        userId: '',
        email,
        displayName: email.split('@')[0],
        role: res.role,
        orgName: orgSlug,
        orgId: '',
        orgSlug,
      })
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
