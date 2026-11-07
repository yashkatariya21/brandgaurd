import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  FileText,
  Crosshair,
  ShieldAlert,
  Atom,
  Scale,
  ShieldCheck,
  Palette,
  Home,
  Info,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import Header from './Header'
import { DEMO_ACCOUNTS, ORG_SLUG, DEMO_PASSWORD, IS_DEMO_MODE } from '../lib/demoAccounts'

interface NavItem {
  to: string
  label: string
  Icon: LucideIcon
}

const navItems: NavItem[] = [
  { to: '/', label: 'Home', Icon: Home },
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/repository', label: 'Repository', Icon: Database },
  { to: '/content', label: 'Content', Icon: FileText },
  { to: '/blast-radius', label: 'Blast Radius', Icon: Crosshair },
  { to: '/findings', label: 'Findings', Icon: ShieldAlert },
  { to: '/rule-tests', label: 'Rule Tests', Icon: Atom },
  { to: '/about', label: 'About', Icon: Info },
]

export default function Layout() {
  const { user, logout, login } = useAuth()
  const { isAuthority, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [switching, setSwitching] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* ── Primary top nav ───────────────────────────────────────────── */}
      <header
        className={`w-full sticky top-0 z-30 border-b flex items-center justify-between px-5 h-14 ${
          isAuthority ? 'text-slate-100' : 'text-[#2D3142]'
        }`}
        style={{
          backgroundColor: isAuthority ? '#1f3a5f' : '#f5f2fc',
          borderColor: isAuthority ? '#162c4a' : 'rgba(126,105,171,0.12)',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={
              isAuthority
                ? { backgroundColor: '#2a7f8e' }
                : {
                    backgroundColor: '#7e69ab',
                    boxShadow: '0 4px 12px rgba(126,105,171,0.25)',
                  }
            }
          >
            <Scale size={16} className="text-white" />
          </div>
          <div className="leading-none">
            <span
              className={`font-bold text-sm tracking-tight ${
                isAuthority ? 'font-newsreader' : 'font-jakarta'
              }`}
            >
              BrandGuard
            </span>
            <span className="hidden sm:inline text-xs opacity-60 ml-1.5">
              & Risk Governance
            </span>
          </div>
          <span
            className="hidden lg:inline text-[10px] font-medium px-2 py-0.5 rounded-full border opacity-70"
            style={{
              borderColor: isAuthority ? 'rgba(255,255,255,0.15)' : 'rgba(126,105,171,0.2)',
            }}
          >
            {user?.orgName ?? 'Workspace'} · v0.2
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-thin mx-2">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : isAuthority
                    ? 'hover:bg-white/10'
                    : 'hover:bg-white/60'
                }`
              }
            >
              <Icon size={14} strokeWidth={1.75} />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right cluster: theme toggle + role switcher (demo) + user */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors"
            style={{
              borderColor: isAuthority ? 'rgba(255,255,255,0.15)' : 'rgba(126,105,171,0.2)',
            }}
          >
            <Palette size={13} strokeWidth={1.75} />
            <span className="hidden sm:inline">{isAuthority ? 'Navy' : 'Lavender'}</span>
          </button>

          {/* Role switcher — demo mode only */}
          {IS_DEMO_MODE && (
            <div className="relative hidden md:block">
              <select
                disabled={switching}
                value={user?.role ?? ''}
                onChange={async (e) => {
                  const acct = DEMO_ACCOUNTS.find((a) => a.role === e.target.value)
                  if (!acct) return
                  setSwitching(true)
                  logout()
                  try {
                    await login(acct.email, DEMO_PASSWORD, ORG_SLUG)
                    // Stay on current route
                    navigate(location.pathname, { replace: true })
                  } catch {
                    navigate('/login')
                  } finally {
                    setSwitching(false)
                  }
                }}
                className="appearance-none text-[11px] font-medium px-2 py-1 rounded-lg border cursor-pointer disabled:opacity-60"
                style={{
                  borderColor: isAuthority ? 'rgba(255,255,255,0.15)' : 'rgba(126,105,171,0.2)',
                  background: 'transparent',
                  color: isAuthority ? '#e2e8f0' : '#2D3142',
                }}
                title="Switch demo role"
              >
                {DEMO_ACCOUNTS.map((a) => (
                  <option key={a.role} value={a.role} style={{ background: '#fff', color: '#1e293b' }}>
                    {a.label}
                  </option>
                ))}
              </select>
              <Users size={12} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
            </div>
          )}

          <div className="hidden lg:flex items-center gap-2">
            <div className="text-right leading-tight">
              <p className="text-xs font-medium">{user?.displayName ?? 'User'}</p>
              <p className="text-[10px] opacity-60 capitalize">{user?.role ?? ''}</p>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                backgroundColor: isAuthority ? '#2a7f8e' : '#7e69ab',
                color: '#fff',
              }}
            >
              {(user?.displayName ?? 'U')[0].toUpperCase()}
            </div>
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>

          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="text-xs px-2.5 py-1 rounded-lg border transition-colors"
            style={{
              borderColor: isAuthority ? 'rgba(255,255,255,0.15)' : 'rgba(126,105,171,0.2)',
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Secondary breadcrumb bar ─────────────────────────────────── */}
      <Header />

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <Outlet />
      </main>
    </div>
  )
}
