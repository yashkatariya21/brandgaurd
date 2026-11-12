import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authApi, setToken, clearToken, getToken } from './api'
import { IS_DEMO_MODE, DEMO_ACCOUNTS, ORG_SLUG } from './lib/demoAccounts'

/**
 * auth.tsx — backend-based authentication with demo fallback.
 *
 * Normal flow:
 *   login() → POST /v1/auth/login → setToken → GET /v1/me → AuthUser
 *   On load → if token exists, GET /v1/me to restore; on failure clear token.
 *
 * Demo fallback (VITE_DEMO_MODE=true):
 *   If the backend is unreachable (network error / "Failed to fetch"):
 *   - login() builds a local AuthUser from the email without a real token.
 *   - On load with no token: auto-signs in as Brand Manager so judges
 *     can browse the full UI immediately.
 *   API calls will still fail gracefully (empty states, error banners) —
 *   but the user is never stuck on the login page with "Failed to fetch".
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

// ── Demo user helpers ─────────────────────────────────────────────────────────

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true          // "Failed to fetch"
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return msg.includes('failed to fetch') ||
           msg.includes('network') ||
           msg.includes('fetch') ||
           msg.includes('load failed') ||
           msg.includes('405') ||          // VITE_API_URL not set → hits Vercel
           msg.includes('method not allowed') ||
           msg.includes('sign-in endpoint rejected') ||
           msg.includes('cannot reach the backend') ||
           msg.includes('check that vite_api_url') ||
           msg.includes('econnrefused') ||
           msg.includes('enotfound')
  }
  return false
}

function demoUserFromEmail(email: string): AuthUser {
  const account = DEMO_ACCOUNTS.find((a) => a.email === email)
  const roleName = account?.role ?? 'brand_manager'
  const displayName = account?.label ?? email.split('@')[0]
  return {
    userId: `demo-${roleName}`,
    email,
    displayName,
    role: roleName,
    orgName: 'NimbusDesk (demo)',
    orgId: 'demo-org',
    orgSlug: ORG_SLUG,
  }
}

const DEFAULT_DEMO_EMAIL = 'brand@nimbusdesk.example'

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
      // No token — if demo mode, auto-sign in as Brand Manager
      if (IS_DEMO_MODE) {
        setUser(demoUserFromEmail(DEFAULT_DEMO_EMAIL))
      }
      setLoading(false)
      return
    }
    // Try to restore session from stored token
    authApi
      .me()
      .then((me) => setUser(buildUser(me, me.role)))
      .catch((err) => {
        clearToken()
        // If backend unreachable in demo mode, restore a demo user so the
        // UI remains browsable
        if (IS_DEMO_MODE && isNetworkError(err)) {
          setUser(demoUserFromEmail(DEFAULT_DEMO_EMAIL))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string, orgSlug: string): Promise<void> => {
    try {
      const res = await authApi.login(email, password, orgSlug)
      setToken(res.token)
      try {
        const me = await authApi.me()
        setUser(buildUser(me, res.role))
      } catch {
        // me() failed but login succeeded — use role from login response
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
    } catch (err) {
      // Network error in demo mode → fall back to a local demo user
      if (IS_DEMO_MODE && isNetworkError(err)) {
        setUser(demoUserFromEmail(email))
        return
      }
      // Real auth error (wrong password, 401, etc.) — re-throw to the UI
      throw err
    }
  }

  const logout = () => {
    clearToken()
    if (IS_DEMO_MODE) {
      // In demo mode, logging out returns to the default demo user
      // rather than the login screen so the UI stays accessible
      setUser(demoUserFromEmail(DEFAULT_DEMO_EMAIL))
    } else {
      setUser(null)
    }
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
