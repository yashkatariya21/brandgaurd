import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, Crosshair, ShieldAlert, Atom, ArrowRight, Users } from 'lucide-react'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import { DEMO_ACCOUNTS, ORG_SLUG, DEMO_PASSWORD, IS_DEMO_MODE } from '../lib/demoAccounts'

export default function LoginPage() {
  const { login } = useAuth()
  const { isAuthority } = useTheme()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const doLogin = async (e: string, p: string, slug: string) => {
    setError('')
    setLoading(true)
    try {
      await login(e, p, slug)
      navigate('/')
    } catch (err: unknown) {
      // Surface the backend error message verbatim (wrong password etc.)
      setError(err instanceof Error ? err.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    doLogin(email, password, ORG_SLUG)
  }

  const handleDemoRole = (acctEmail: string) => {
    doLogin(acctEmail, DEMO_PASSWORD, ORG_SLUG)
  }

  const handleStartDemo = () => {
    const bm = DEMO_ACCOUNTS.find((a) => a.role === 'brand_manager')
    if (bm) doLogin(bm.email, DEMO_PASSWORD, ORG_SLUG)
  }

  const features = [
    { Icon: Crosshair, title: 'Blast-Radius Intelligence', desc: 'See every asset affected when a key fact changes' },
    { Icon: ShieldAlert, title: 'Adversarial Red Team', desc: '3 AI personas + Prosecutor vs Defender debate' },
    { Icon: Atom, title: 'Guideline Chaos Testing', desc: 'Find ambiguity in brand rules before they cause problems' },
  ]

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl text-sm text-main bg-canvas border border-subtle focus:outline-none focus:border-accent transition-all'

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* ── Left panel ── */}
      <div
        className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-14"
        style={
          isAuthority
            ? { background: 'linear-gradient(160deg, #1f3a5f 0%, #152740 100%)', color: '#fff' }
            : { background: 'linear-gradient(160deg, #7e69ab 0%, #5b4a8c 100%)', color: '#fff' }
        }
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: isAuthority ? '#2a7f8e' : 'rgba(255,255,255,0.18)' }}
          >
            <Scale size={20} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight font-newsreader">BrandGuard</span>
        </div>

        <div className="max-w-md">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block animate-pulse" />
            Brand Truth & Risk Governance
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-5 font-newsreader">
            Keep every<br />
            <span style={{ color: isAuthority ? '#5eead4' : '#f5d0fe' }}>brand claim</span><br />
            accurate.
          </h1>
          <p className="text-base leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.75)' }}>
            BrandGuard automatically checks marketing content against your approved
            fact repository — catching stale statistics, wrong prices, and embargo
            violations before they go live.
          </p>
          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  <f.Icon size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          © 2026 BrandGuard · Built for Inkloom AI Hackathon
        </p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-sm py-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent">
              <Scale size={18} className="text-white" />
            </div>
            <span className="font-bold text-main font-newsreader text-lg">BrandGuard</span>
          </div>

          {/* ── Demo section (shown only when VITE_DEMO_MODE=true) ── */}
          {IS_DEMO_MODE && (
            <div className="rounded-2xl glass-panel p-5 mb-5 border border-subtle">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-main flex items-center gap-1.5">
                  <Users size={15} className="text-accent" /> Try the demo
                </h3>
                <p className="text-[11px] text-muted italic">Demo data is fictional.</p>
              </div>

              {/* Prominent "Start demo" button */}
              <button
                disabled={loading}
                onClick={handleStartDemo}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-accent hover:opacity-90 disabled:opacity-60 mb-3 flex items-center justify-center gap-2"
              >
                {loading ? 'Signing in…' : 'Start demo (Brand Manager)'}
                {!loading && <ArrowRight size={15} />}
              </button>

              {/* Role buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                {DEMO_ACCOUNTS.map((acct) => (
                  <button
                    key={acct.role}
                    disabled={loading}
                    onClick={() => handleDemoRole(acct.email)}
                    className="text-xs px-2.5 py-2 rounded-lg border border-subtle text-muted hover:bg-accent-subtle hover:text-accent hover:border-accent/30 transition-colors disabled:opacity-50 text-left"
                  >
                    {acct.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Manual sign-in ── */}
          <div className="rounded-2xl glass-modal p-7 border border-subtle">
            <h2 className="text-xl font-bold text-main mb-1 font-newsreader">Sign in</h2>
            <p className="text-xs text-muted mb-5">Enter your email and password.</p>

            {error && (
              <div className="mb-4 px-3 py-2.5 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-accent hover:opacity-90 transition-opacity disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
              >
                {loading ? 'Signing in…' : 'Sign in'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
