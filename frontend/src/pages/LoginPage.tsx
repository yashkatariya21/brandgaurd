import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@nimbusdesk.example')
  const [password, setPassword] = useState('password')
  const [orgSlug, setOrgSlug] = useState('nimbusdesk')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password, orgSlug)
      navigate('/')
    } catch {
      // Backend may be offline – auto-login handles it, just navigate
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async (role: string) => {
    const map: Record<string, string> = {
      admin: 'admin@nimbusdesk.example',
      brand: 'brand@nimbusdesk.example',
      approver: 'approver@nimbusdesk.example',
      creator: 'creator@nimbusdesk.example',
    }
    setEmail(map[role] ?? email)
    setPassword('password')
    setOrgSlug('nimbusdesk')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">BrandGuard</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Keep every claim<br />accurate, every time.
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-10">
            BrandGuard automatically checks marketing content against your approved fact repository — catching stale stats, wrong prices, and embargo violations before they go live.
          </p>

          <div className="space-y-4">
            {[
              { icon: '🔍', title: 'Automated claim extraction', desc: 'Identifies every factual claim in a piece of content' },
              { icon: '💥', title: 'Blast-radius analysis', desc: 'See every asset affected when a key fact changes' },
              { icon: '✅', title: 'Approval workflows', desc: 'Structured review before any correction goes live' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-white font-medium text-sm">{f.title}</p>
                  <p className="text-slate-400 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-sm">Built for the Inkloom AI Hackathon · 2026</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-semibold text-lg text-gray-900">BrandGuard</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
          <p className="text-gray-500 text-sm mb-8">Use the quick-access buttons below or enter credentials manually.</p>

          {/* Quick access */}
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Quick access — NimbusDesk demo</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: 'admin', label: 'Admin', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
                { role: 'brand', label: 'Brand Manager', color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' },
                { role: 'approver', label: 'Approver', color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
                { role: 'creator', label: 'Creator', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
              ].map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => quickLogin(r.role)}
                  className={`px-3 py-2 border rounded-lg text-xs font-medium transition-colors ${r.color}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">or sign in manually</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Organisation</label>
              <input
                type="text"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="nimbusdesk"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="admin@nimbusdesk.example"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
