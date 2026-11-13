import React, { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Database, FileText, Crosshair, ShieldAlert, Atom, Palette, Home, Info, LogOut, type LucideIcon } from 'lucide-react'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import Header from './Header'
import BrandGuardLogo from './BrandGuardLogo'
import DemoStepper from './DemoStepper'
import { DEMO_ACCOUNTS, ORG_SLUG, DEMO_PASSWORD, IS_DEMO_MODE, personas } from '../lib/demoAccounts'

interface NavItem { to: string; label: string; Icon: LucideIcon }
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
  const isDemoAccount = IS_DEMO_MODE && user?.orgSlug === ORG_SLUG && DEMO_ACCOUNTS.some(a => a.email.toLowerCase() === user?.email.toLowerCase())

  const demoAccount = isDemoAccount ? DEMO_ACCOUNTS.find(a => a.email.toLowerCase() === user?.email.toLowerCase()) : undefined
  const roleLabel = DEMO_ACCOUNTS.find(a => a.role === user?.role)?.label ?? user?.role?.replace(/_/g, ' ') ?? 'User'
  const displayName = demoAccount && (!user?.displayName || user.displayName.toLowerCase().replace(/[ _-]/g, '') === user.role.toLowerCase().replace(/[ _-]/g, '')) ? personas[demoAccount.role].name : user?.displayName || 'User'

  async function switchRole(role: string) {
    const account = DEMO_ACCOUNTS.find(a => a.role === role)
    if (!account || switching) return
    setSwitching(true)
    logout()
    try {
      await login(account.email, DEMO_PASSWORD, ORG_SLUG)
      navigate(location.pathname, { replace: true })
    } catch {
      navigate('/login', { replace: true, state: { demoSwitchFailed: true } })
    } finally { setSwitching(false) }
  }

  return <div className="workspace-shell bg-canvas">
    <header className={`workspace-header ${isAuthority ? 'workspace-header-authority' : 'workspace-header-serene'}`}>
      <div className="workspace-header-top workspace-container">
        <NavLink to="/" aria-label="BrandGuard home" className="workspace-brand"><BrandGuardLogo size={34} color={isAuthority ? 'white' : undefined} /><span className="workspace-brand-divider" /><span className="workspace-brand-caption">BRAND TRUTH<br />WORKSPACE</span></NavLink>
        <div className="workspace-actions">
          <div className="workspace-user"><span className="workspace-user-avatar">{displayName[0].toUpperCase()}</span><span><strong>{displayName} · {roleLabel}</strong><small>{user?.orgName || 'Workspace'}</small></span></div>
          {isDemoAccount && <label className="workspace-role"><span className="sr-only">Switch demo role</span><select aria-label="Switch demo role" disabled={switching} value={user?.role ?? ''} onChange={e => void switchRole(e.target.value)}>{DEMO_ACCOUNTS.map(a => <option key={a.role} value={a.role}>{a.label}</option>)}</select></label>}
          <button className="workspace-action" onClick={toggleTheme} aria-label={`Switch to ${isAuthority ? 'Lavender' : 'Navy'} theme`} title="Switch theme"><Palette size={16} /><span>Theme</span></button>
          <button className="workspace-action" onClick={() => { logout(); navigate('/login') }}><LogOut size={16} /><span>Sign out</span></button>
        </div>
      </div>
      <nav className="workspace-nav workspace-container" aria-label="Main navigation">{navItems.map(({ to, label, Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `workspace-nav-link ${isActive ? 'is-active' : ''}`}><Icon size={15} strokeWidth={1.8} /><span>{label}</span></NavLink>)}</nav>
    </header>
    <DemoStepper />
    <Header />
    <main className="flex-1 overflow-y-auto scrollbar-thin"><Outlet /></main>
  </div>
}
