import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crosshair, ShieldAlert, Atom, ArrowRight, Users, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import BrandGuardLogo from '../components/BrandGuardLogo'
import { DEMO_ACCOUNTS, ORG_SLUG, DEMO_PASSWORD, IS_DEMO_MODE } from '../lib/demoAccounts'

export default function LoginPage() {
  const { login, user } = useAuth()
  const { isAuthority } = useTheme()
  const navigate = useNavigate()

  // If already authenticated (demo auto-login), skip straight to home
  React.useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const doLogin = async (e: string, p: string, slug: string) => {
    setError('')
    setLoading(true)
    try {
      await login(e, p, slug)
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.'
      // "Failed to fetch" means no backend — in demo mode the auth fallback
      // already signed the user in, so just navigate without showing an error.
      if (
        IS_DEMO_MODE &&
        (msg.toLowerCase().includes('fetch') ||
          msg.toLowerCase().includes('network') ||
          msg.toLowerCase().includes('load failed'))
      ) {
        navigate('/')
        return
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    doLogin(email.trim(), password, ORG_SLUG)
  }

  const handleDemoRole = (acctEmail: string) => {
    // In demo mode without a backend, login() will fall back to a local user,
    // so we attempt login even if DEMO_PASSWORD is empty.
    doLogin(acctEmail, DEMO_PASSWORD || 'demo', ORG_SLUG)
  }

  const handleStartDemo = () => {
    const bm = DEMO_ACCOUNTS.find((a) => a.role === 'brand_manager')
    if (bm) handleDemoRole(bm.email)
  }

  const sideGradient = isAuthority
    ? 'linear-gradient(160deg, #1f3a5f 0%, #0f2040 100%)'
    : 'linear-gradient(160deg, #7e69ab 0%, #5b4a8c 100%)'

  const accentLight = isAuthority ? '#5eead4' : '#f5d0fe'

  const features = [
    {
      Icon: Crosshair,
      title: 'Blast-Radius Intelligence',
      desc: 'See every asset affected when a key fact changes — confirmed and possible, sorted by urgency.',
    },
    {
      Icon: ShieldAlert,
      title: 'Adversarial Red Team',
      desc: '3 AI personas review your content. Prosecutor vs Defender shows both sides. You decide.',
    },
    {
      Icon: Atom,
      title: 'Guideline Chaos Testing',
      desc: 'Find ambiguity in tone rules before they cause problems. Human labels are ground truth.',
    },
  ]

  const inputBase =
    'w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/5 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-white/50 focus:bg-white/8 transition-all'

  return (
    <div className="min-h-screen flex bg-[#0f172a]">
      {/* ── Left branded panel ───────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-14 overflow-hidden"
        style={{ background: sideGradient }}
      >
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,1) 39px, rgba(255,255,255,1) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,1) 39px, rgba(255,255,255,1) 40px)',
          }}
        />

        {/* Glow orbs */}
        <div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: isAuthority ? '#2a7f8e' : '#7e69ab' }}
        />
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: isAuthority ? '#5eead4' : '#f5d0fe' }}
        />

        {/* Header */}
        <BrandGuardLogo size={36} color="white" className="relative z-10" />

        {/* Hero */}
        <div className="max-w-md relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 border"
            style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block animate-pulse"
              style={{ backgroundColor: isAuthority ? '#5eead4' : '#f5d0fe' }}
            />
            Brand Truth & Risk Governance
          </div>

          <h1 className="text-white font-newsreader text-5xl font-bold leading-[1.15] mb-5">
            Keep every<br />
            <span style={{ color: accentLight }}>brand claim</span><br />
            accurate.
          </h1>

          <p className="text-base leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.65)' }}>
            BrandGuard checks marketing content against your approved fact repository —
            catching stale statistics, wrong prices, and embargo violations before they go live.
          </p>

          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border"
                  style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }}
                >
                  <f.Icon size={16} className="text-white" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs relative z-10" style={{ color: 'rgba(255,255,255,0.3)' }}>
          © 2026 BrandGuard · Built for Inkloom AI Hackathon
        </p>
      </div>

      {/* ── Right sign-in panel ──────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-[360px] py-8 space-y-4">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <BrandGuardLogo size={28} color="white" />
          </div>

          {/* ── Demo section ────────────────────────────────────────── */}
          {IS_DEMO_MODE && (
            <div
              className="rounded-2xl p-5 border"
              style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Users size={14} className="opacity-70" /> Try the demo
                </h3>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Fictional data
                </span>
              </div>

              {/* Start demo CTA */}
              <button
                disabled={loading}
                onClick={handleStartDemo}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all mb-3 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{
                  background: isAuthority
                    ? 'linear-gradient(135deg, #2a7f8e, #226673)'
                    : 'linear-gradient(135deg, #7e69ab, #5b4a8c)',
                  color: '#fff',
                  boxShadow: isAuthority
                    ? '0 4px 16px rgba(42,127,142,0.4)'
                    : '0 4px 16px rgba(126,105,171,0.4)',
                }}
              >
                {loading ? 'Signing in…' : 'Start demo (Brand Manager)'}
                {!loading && <ArrowRight size={15} />}
              </button>

              {/* Role buttons 2×3 grid */}
              <div className="grid grid-cols-2 gap-1.5">
                {DEMO_ACCOUNTS.map((acct) => (
                  <button
                    key={acct.role}
                    disabled={loading}
                    onClick={() => handleDemoRole(acct.email)}
                    className="text-xs px-2.5 py-2 rounded-lg border text-left transition-all disabled:opacity-50"
                    style={{
                      borderColor: 'rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'rgba(255,255,255,0.65)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)'
                    }}
                  >
                    {acct.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Manual sign-in card ──────────────────────────────────── */}
          <div
            className="rounded-2xl p-7 border"
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderColor: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <h2 className="text-xl font-bold text-white mb-1 font-newsreader">Sign in</h2>
            <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Enter your email and password to access BrandGuard.
            </p>

            {error && (
              <div
                className="mb-4 px-3 py-2.5 rounded-xl text-xs border"
                style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className={`${inputBase} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70 transition-opacity"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={15} className="text-white" /> : <Eye size={15} className="text-white" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
                style={{
                  background: isAuthority
                    ? 'linear-gradient(135deg, #2a7f8e, #226673)'
                    : 'linear-gradient(135deg, #7e69ab, #5b4a8c)',
                  boxShadow: isAuthority
                    ? '0 4px 16px rgba(42,127,142,0.35)'
                    : '0 4px 16px rgba(126,105,171,0.35)',
                }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          </div>

          <p
            className="text-center text-[11px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            A human makes every final decision. AI risk perspective, not legal advice.
          </p>
        </div>
      </div>
    </div>
  )
}
