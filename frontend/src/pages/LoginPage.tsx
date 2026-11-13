import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../auth'
import BrandGuardLogo from '../components/BrandGuardLogo'
import { DEMO_ACCOUNTS, ORG_SLUG, DEMO_PASSWORD, IS_DEMO_MODE } from '../lib/demoAccounts'

const personas: Record<string, { name: string; initials: string; description: string }> = {
  admin: { name: 'Aarav Sharma', initials: 'AS', description: 'Set up the workspace' },
  brand_manager: { name: 'Ananya Rao', initials: 'AR', description: 'Keep the brand on track' },
  approver: { name: 'Priya Mehta', initials: 'PM', description: 'Review and decide' },
  manager: { name: 'Rohan Shah', initials: 'RS', description: 'Coordinate the team' },
  creator: { name: 'Kavya Nair', initials: 'KN', description: 'Create with confidence' },
  external_creator: { name: 'Aditya Iyer', initials: 'AI', description: 'Collaborate on content' },
}

export default function LoginPage() {
  const { login, user, loading: restoring } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgSlug, setOrgSlug] = useState(ORG_SLUG)
  const [selected, setSelected] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(() => location.state?.demoSwitchFailed ? 'Could not switch demo role. Please check the seeded demo credentials and sign in again.' : '')
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [validation, setValidation] = useState({ email: false, password: false })

  useEffect(() => { if (user) navigate('/', { replace: true }) }, [user, navigate])

  async function signIn(accountEmail: string, accountPassword: string, slug: string) {
    if (loading || restoring) return
    setError('')
    setValidation({ email: false, password: false })
    setLoading(true)
    setSlow(false)
    const timer = window.setTimeout(() => setSlow(true), 3000)
    try {
      await login(accountEmail.trim(), accountPassword, slug.trim().toLowerCase())
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
    } finally { window.clearTimeout(timer); setSlow(false); setLoading(false) }
  }

  function choosePersona(role: string, accountEmail: string) {
    setSelected(role)
    setEmail(accountEmail)
    setPassword(DEMO_PASSWORD)
    setOrgSlug(ORG_SLUG)
    void signIn(accountEmail, DEMO_PASSWORD, ORG_SLUG)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const missing = { email: !email.trim(), password: !password }
    setValidation(missing)
    if (!missing.email && !missing.password) void signIn(email, password, orgSlug)
  }

  return <main className="entry-shell">
    <section className="entry-intro" aria-label="About BrandGuard">
      <div className="entry-top"><BrandGuardLogo size={38} color="white" className="text-white" /><span>THE BRAND TRUTH WORKSPACE <span className="entry-star">✳</span></span></div>
      <div className="entry-intro-content"><div className="entry-index"><span>01 / A MORE THOUGHTFUL WORKFLOW</span><span>↘</span></div>
        <h1>Know what changed.<br /><em>Decide what’s next.</em></h1>
        <p>Check content against approved brand facts and rules before it publishes, see what a fact change breaks, and keep a human in charge.</p>
        <div className="entry-orbit" aria-hidden="true"><span className="entry-orbit-ring ring-one" /><span className="entry-orbit-ring ring-two" /><span className="entry-orbit-core"><ShieldCheck size={42} strokeWidth={1.2} /></span><span className="entry-orbit-label label-facts">01 BRAND-AS-CODE <ArrowUpRight size={14} /></span><span className="entry-orbit-label label-people">02 RED TEAM <ArrowUpRight size={14} /></span><span className="entry-orbit-label label-decisions">03 CHAOS TESTING <ArrowUpRight size={14} /></span></div>
      </div>
      <div className="entry-bottom"><span>BUILT FOR HUMAN JUDGMENT</span><span>BRANDGUARD © {new Date().getFullYear()}</span></div>
    </section>
    <section className="entry-workspace" aria-label="Sign in">
      <div className="entry-mobile-logo"><BrandGuardLogo size={34} /></div>
      <div className="entry-content"><div className="entry-heading"><div><p className="entry-kicker"><Sparkles size={13} /> WELCOME TO BRANDGUARD</p><h2>Make yourself<br /><em>at home.</em></h2><p>Review your brand’s facts, content and guidelines in one workspace. Choose a demo perspective or sign in.</p></div><span className="entry-heading-mark">✳</span></div>
      <details className="entry-preview">
        <summary><span><span className="entry-preview-kicker">A QUICK LOOK / ILLUSTRATIVE EXAMPLE</span><strong>From a changed fact to a human decision</strong></span><ArrowUpRight size={17} /></summary>
        <div className="entry-preview-body">
          <div><span>01 / SOURCE</span><p>An approved product fact changes.</p></div>
          <div><span>02 / IMPACT</span><p>Review linked content and distinguish confirmed links from possible matches.</p></div>
          <div><span>03 / DECISION</span><p>Inspect the supporting context and decide what needs attention.</p></div>
          <p className="entry-preview-caption">Illustration of the workflow, not a live finding. Results depend on registered content and available evidence.</p>
        </div>
      </details>
      <div className="entry-trust-note"><ShieldCheck size={17} /><span><strong>Built for human decisions.</strong> The current demo uses heuristics; hosted AI is disabled. No automatic publishing.</span></div>
      {IS_DEMO_MODE && <section className="persona-section" aria-label="Demo personas"><div className="persona-heading"><div><span>01 / GET STARTED</span><h3>Pick a perspective.</h3></div><span className="persona-badge">FICTIONAL DEMO</span></div><p>Choose a persona to sign in to the demo.</p>
        <div className="persona-grid">{DEMO_ACCOUNTS.map((account, i) => { const persona = personas[account.role]; return <button className={`persona-card persona-color-${i} ${selected === account.role ? 'is-selected' : ''}`} type="button" key={account.role} onClick={() => choosePersona(account.role, account.email)} aria-pressed={selected === account.role} disabled={loading || restoring}>
          <span className="persona-avatar">{persona.initials}</span><span className="persona-copy"><strong>{persona.name}</strong><small>{account.label}</small></span><ArrowUpRight className="persona-arrow" size={16} /><span className="persona-description">{persona.description}</span>
        </button> })}</div><p className="persona-note">Names are illustrative.</p></section>}
      <section className="entry-form-section"><div className="persona-heading"><div><span>02 / YOUR DETAILS</span><h3>{selected ? 'Ready when you are.' : 'Sign in to continue.'}</h3></div><ShieldCheck size={21} /></div>
        {error && <div className="login-error" role="alert"><strong>Couldn’t sign in.</strong> {error}{selected && <p>Demo credentials must match the password used to seed the backend. You can edit the password below and try again.</p>}</div>}
        {slow && <p role="status" className="entry-slow">Waking up the server — this can take up to a minute…</p>}
        <form onSubmit={handleSubmit} className="entry-form" noValidate>
          <button type="button" className="entry-advanced" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)}>Advanced {advanced ? '−' : '+'}</button>
          {advanced && <div><label htmlFor="login-org">Workspace slug</label><input id="login-org" name="organization" autoComplete="organization" value={orgSlug} onChange={e => setOrgSlug(e.target.value)} /></div>}
          <div><label htmlFor="login-email">Email address</label><input id="login-email" name="email" type="email" autoComplete="username" value={email} onChange={e => { setEmail(e.target.value); setSelected(null) }} placeholder="you@example.com" aria-invalid={validation.email} aria-describedby={validation.email ? 'email-error' : undefined} />{validation.email && <p id="email-error" className="entry-field-error" role="alert">Enter your email</p>}</div>
          <div><label htmlFor="login-password">Password</label><div className="entry-password"><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" aria-invalid={validation.password} aria-describedby={[validation.password ? 'password-error' : '', IS_DEMO_MODE ? 'password-help' : ''].filter(Boolean).join(' ') || undefined} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{validation.password && <p id="password-error" className="entry-field-error" role="alert">Enter your password</p>}{IS_DEMO_MODE && <p id="password-help" className="entry-help">Password is filled in automatically when you pick a demo persona.</p>}</div>
          <button className="entry-submit" type="submit" disabled={loading || restoring}><span>{restoring ? 'Checking session…' : loading ? 'Signing in…' : selected ? `Continue as ${personas[selected].name}` : 'Sign in to workspace'}</span><ArrowRight size={18} /></button>
        </form><p className="entry-disclaimer">Demo accounts use fictional data. AI is a risk perspective, not legal advice. A human makes every decision.</p>
      </section></div>
    </section>
  </main>
}
