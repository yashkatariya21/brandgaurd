import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crosshair, ShieldAlert, Atom, ArrowRight, Eye, EyeOff, Zap } from 'lucide-react'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import BrandGuardLogo from '../components/BrandGuardLogo'
import { DEMO_ACCOUNTS, ORG_SLUG, DEMO_PASSWORD, IS_DEMO_MODE } from '../lib/demoAccounts'

export default function LoginPage() {
  const { login, user } = useAuth()
  const { isAuthority } = useTheme()
  const navigate = useNavigate()

  // Already signed in (demo auto-login) → go straight to home
  React.useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const doLogin = async (e: string, p: string) => {
    setError('')
    setLoading(true)
    try {
      await login(e, p, ORG_SLUG)
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.'
      // 405 = VITE_API_URL not set (request hit Vercel instead of Railway)
      // network errors = backend unreachable
      // In both cases: demo fallback in auth.tsx already set the user, navigate.
      const msgLower = msg.toLowerCase()
      const isBackendMissing =
        msgLower.includes('405') ||
        msgLower.includes('rejected') ||
        msgLower.includes('fetch') ||
        msgLower.includes('network') ||
        msgLower.includes('load failed') ||
        msgLower.includes('cannot reach the backend') ||
        msgLower.includes('vite_api_url') ||
        msgLower.includes('econnrefused') ||
        msgLower.includes('enotfound')
      if (IS_DEMO_MODE && isBackendMissing) {
        navigate('/')
        return
      }
      setError(isBackendMissing
        ? 'Backend not reachable — using demo mode. Set VITE_API_URL in Vercel for live data.'
        : msg
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!email.trim() || !password) { setError('Please enter email and password.'); return }
    doLogin(email.trim(), password)
  }

  // Fill the form with a demo account and submit
  const loginAsDemo = (acctEmail: string) => {
    doLogin(acctEmail, DEMO_PASSWORD)
  }

  const accent = isAuthority ? '#2a7f8e' : '#7e69ab'
  const accentLight = isAuthority ? '#5eead4' : '#f5d0fe'
  const sideGradient = isAuthority
    ? 'linear-gradient(160deg, #1f3a5f 0%, #0a2030 100%)'
    : 'linear-gradient(160deg, #7e69ab 0%, #4a3280 100%)'

  const inputBase =
    'w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-white/50 transition-all'

  const roleColors: Record<string, string> = {
    admin: '#6366f1', brand_manager: '#2a7f8e', approver: '#10b981',
    manager: '#f59e0b', creator: '#ec4899', external_creator: '#8b5cf6',
  }

  return (
    <div className="min-h-screen flex bg-[#0a0f1e]">

      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: sideGradient }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,transparent,transparent 39px,#fff 39px,#fff 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#fff 39px,#fff 40px)',
        }} />
        {/* Glow */}
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-25 blur-3xl pointer-events-none" style={{ background: accent }} />
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full opacity-10 blur-3xl pointer-events-none" style={{ background: accentLight }} />

        <BrandGuardLogo size={36} color="white" className="relative z-10" />

        <div className="max-w-md relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 border"
            style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentLight }} />
            Brand Truth & Risk Governance
          </div>
          <h1 className="text-white font-newsreader text-5xl font-bold leading-tight mb-5">
            Keep every<br />
            <span style={{ color: accentLight }}>brand claim</span><br />
            accurate.
          </h1>
          <p className="leading-relaxed mb-10 text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            BrandGuard checks marketing content against your approved fact repository —
            catching stale statistics, wrong prices, and embargo violations before they go live.
          </p>
          {[
            { Icon: Crosshair, t: 'Blast-Radius Intelligence', d: 'See every asset affected when a key fact changes.' },
            { Icon: ShieldAlert, t: 'Adversarial Red Team',    d: '3 AI personas · Prosecutor vs Defender · You decide.' },
            { Icon: Atom,        t: 'Guideline Chaos Testing', d: 'Find ambiguity in tone rules before they cause problems.' },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border"
                style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}>
                <Icon size={16} className="text-white" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{d}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs relative z-10" style={{ color: 'rgba(255,255,255,0.25)' }}>
          © 2026 BrandGuard · Inkloom AI Hackathon
        </p>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-start justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-[380px] py-8 space-y-4">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-4">
            <BrandGuardLogo size={28} color="white" />
          </div>

          {/* ── DEMO SECTION ───────────────────────────────────────── */}
          {IS_DEMO_MODE && (
            <div className="rounded-2xl border overflow-hidden"
              style={{ borderColor: `${accent}60`, background: `${accent}12` }}>

              {/* Header */}
              <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: `${accent}30` }}>
                <Zap size={15} style={{ color: accentLight }} />
                <span className="text-sm font-bold text-white">Demo — click any role to start</span>
                <span className="ml-auto text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Fictional data · no account needed
                </span>
              </div>

              <div className="px-5 py-4 space-y-3">
                {/* Big "Start demo" CTA */}
                <button
                  disabled={loading}
                  onClick={() => loginAsDemo('brand@nimbusdesk.example')}
                  className="w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${isAuthority ? '#226673' : '#5b4a8c'})`,
                    color: '#fff',
                    boxShadow: `0 4px 20px ${accent}50`,
                  }}
                >
                  {loading ? 'Opening…' : '⚡ Start demo as Brand Manager'}
                  {!loading && <ArrowRight size={15} />}
                </button>

                {/* Role grid — shows role + email */}
                <div className="grid grid-cols-1 gap-1.5">
                  {DEMO_ACCOUNTS.map((acct) => (
                    <button
                      key={acct.role}
                      disabled={loading}
                      onClick={() => loginAsDemo(acct.email)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all disabled:opacity-50 group"
                      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                    >
                      {/* Colour dot */}
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: roleColors[acct.role] ?? '#64748b' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white leading-tight">{acct.label}</p>
                        <p className="text-[11px] font-mono truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {acct.email}
                        </p>
                      </div>
                      <ArrowRight size={12} className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition-opacity text-white" />
                    </button>
                  ))}
                </div>

                {/* Credentials info box */}
                <div className="rounded-lg px-3 py-2.5 text-xs"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Demo credentials (NimbusDesk workspace)
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Org: <span className="font-mono text-white/60">nimbusdesk</span>
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Password: <span className="font-mono text-white/60">{DEMO_PASSWORD}</span>
                  </p>
                  <p className="mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    All data is fictional. Works without a live backend.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Manual sign-in ──────────────────────────────────────── */}
          <div className="rounded-2xl p-6 border"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
            <h2 className="text-lg font-bold text-white mb-1 font-newsreader">Sign in manually</h2>
            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Use your email and password if you have a live backend.
            </p>

            {error && (
              <div className="mb-4 px-3 py-2.5 rounded-xl text-xs border"
                style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Email
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="email" className={inputBase} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Password
                </label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" autoComplete="current-password"
                    className={`${inputBase} pr-10`} />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70"
                    aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? <EyeOff size={15} className="text-white" /> : <Eye size={15} className="text-white" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${accent}, ${isAuthority ? '#226673' : '#5b4a8c'})` }}>
                {loading ? 'Signing in…' : 'Sign in'} {!loading && <ArrowRight size={15} />}
              </button>
            </form>
          </div>

          <p className="text-center text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
            AI risk perspective, not legal advice. A human makes every decision.
          </p>
        </div>
      </div>
    </div>
  )
}
