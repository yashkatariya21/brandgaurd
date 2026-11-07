import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scale, Crosshair, ShieldAlert, Atom, ArrowRight, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '../auth'
import { useTheme } from '../theme'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const { login, register: registerUser } = useAuth()
  const { isAuthority } = useTheme()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')

  // shared
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  // register-only
  const [name, setName] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(phone, password)
      } else {
        await registerUser(name, phone, password)
      }
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setMode('login')
    setPhone('1234567890')
    setPassword('demo123')
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
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent">
              <Scale size={18} className="text-white" />
            </div>
            <span className="font-bold text-main font-newsreader text-lg">BrandGuard</span>
          </div>

          <div className="rounded-2xl glass-modal p-8 border border-subtle">
            {/* Mode tabs */}
            <div className="flex gap-1 bg-canvas-secondary p-1 rounded-lg mb-6">
              {(['login', 'register'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m)
                    setError('')
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    mode === m ? 'bg-surface text-accent shadow-sm' : 'text-muted hover:text-main'
                  }`}
                >
                  {m === 'login' ? <LogIn size={14} /> : <UserPlus size={14} />}
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <h2 className="text-xl font-bold text-main mb-1 font-newsreader">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-xs text-muted mb-6">
              {mode === 'login'
                ? 'Sign in with your phone number and password.'
                : 'Register to start using BrandGuard. Stored locally on this device.'}
            </p>

            {error && (
              <div className="mb-4 px-3 py-2.5 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Full name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className={inputCls}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Phone number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 1234567890"
                  required
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
                  className={inputCls}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-accent hover:opacity-90 transition-opacity disabled:opacity-60 mt-2 flex items-center justify-center gap-2"
              >
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            {mode === 'login' && (
              <button
                onClick={fillDemo}
                className="w-full mt-4 text-xs text-accent hover:opacity-80 text-center"
              >
                Use demo account (1234567890 / demo123)
              </button>
            )}
          </div>
          <p className="text-center text-xs text-muted mt-4">
            Your account is stored locally on this device. A human makes every decision.
          </p>
        </div>
      </div>
    </div>
  )
}
