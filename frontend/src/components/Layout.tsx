import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

const navItems = [
  {
    to: '/',
    label: 'Dashboard',
    desc: 'Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/repository',
    label: 'Repository',
    desc: 'Facts & Rules',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
  },
  {
    to: '/content',
    label: 'Content',
    desc: 'Submit & analyse',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/blast-radius',
    label: 'Blast Radius',
    desc: 'Impact analysis',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    to: '/findings',
    label: 'Findings',
    desc: 'Review & decide',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    to: '/rule-tests',
    label: 'Rule Tests',
    desc: 'Chaos testing',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

const roleConfig: Record<string, { label: string; cls: string }> = {
  admin: { label: 'Admin', cls: 'bg-violet-100 text-violet-700' },
  brand_manager: { label: 'Brand Manager', cls: 'bg-indigo-100 text-indigo-700' },
  approver: { label: 'Approver', cls: 'bg-emerald-100 text-emerald-700' },
  manager: { label: 'Manager', cls: 'bg-sky-100 text-sky-700' },
  creator: { label: 'Creator', cls: 'bg-amber-100 text-amber-700' },
  external_creator: { label: 'External', cls: 'bg-gray-100 text-gray-600' },
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const roleInfo = roleConfig[user?.role ?? ''] ?? { label: user?.role ?? '', cls: 'bg-gray-100 text-gray-600' }

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-gray-50 md:overflow-hidden">
      <header className="md:hidden bg-slate-900 text-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-sm">BrandGuard</p>
            <p className="text-slate-400 text-xs truncate">{user?.orgName ?? 'Workspace'}</p>
          </div>
          <button
            type="button"
            onClick={() => { logout(); navigate('/login') }}
            className="rounded px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Sign out
          </button>
        </div>
        <nav aria-label="Primary navigation" className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-shrink-0 items-center gap-2 rounded px-3 py-2 text-sm ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-56 bg-slate-900 flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-500 rounded-md flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-none">BrandGuard</p>
              <p className="text-slate-500 text-xs mt-0.5">{user?.orgName ?? 'Workspace'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              {item.icon}
              <div>
                <p className="font-medium leading-none">{item.label}</p>
                <p className="text-[10px] opacity-60 mt-0.5">{item.desc}</p>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="px-3 py-2 mb-1">
            <p className="text-white text-sm font-medium truncate">{user?.displayName ?? 'Account'}</p>
            <p className="text-slate-500 text-xs truncate">{user?.email}</p>
            <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-medium ${roleInfo.cls}`}>
              {roleInfo.label}
            </span>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 md:overflow-y-auto">
        <div className="border-b border-indigo-100 bg-indigo-50 px-4 py-3 text-xs leading-relaxed text-indigo-950 md:px-8" role="note">
          <strong>AI disclosure:</strong> When live AI is configured, Red Team and chaos checks send relevant text to OpenAI using the server-configured model. Demo-mode outputs are heuristic, not AI-generated. Treat suggestions as unverified; a human makes every decision and no content is changed or published automatically.
        </div>
        <Outlet />
      </main>
    </div>
  )
}
