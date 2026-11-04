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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('bg_token')
    if (!token) {
      setUser(null)
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
        clearToken()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string, orgSlug: string) => {
    try {
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
        role: me.role,
      })
    } catch (error) {
      clearToken()
      setUser(null)
      throw error
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
