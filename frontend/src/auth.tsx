import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi, setToken, clearToken, getToken } from './api'

/**
 * auth.tsx — backend-based authentication.
 * Login calls POST /v1/auth/login, stores the JWT in localStorage under
 * 'bg_token', then calls GET /v1/me to hydrate AuthUser.
 * On load, if a token exists, /v1/me is called to restore the session; on
 * failure the token is cleared and the user is shown the login page.
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
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
          role: data.role,
          orgName: data.org.name,
          orgId: data.org.id,
          orgSlug: data.org.slug,
        })
      })
      .catch(() => {
        // Token is invalid or backend unreachable — clear it and show login.
        clearToken()
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
      // Use the role returned by /login (which may be multi-org specific)
      role: res.role,
      orgName: me.org.name,
      orgId: me.org.id,
      orgSlug: me.org.slug,
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
