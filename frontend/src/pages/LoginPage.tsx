import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../auth'
import BrandGuardLogo from '../components/BrandGuardLogo'
import { DEMO_ACCOUNTS, ORG_SLUG, DEMO_PASSWORD, IS_DEMO_MODE, personas } from '../lib/demoAccounts'


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

  useEffect(() => { if (user) navigate('/', { replace: true }) }, [user, navigate])

  function choosePersona(role: string, accountEmail: string) {
    setSelected(role)
    setEmail(accountEmail)
    setPassword(DEMO_PASSWORD)
    setOrgSlug(ORG_SLUG)
    setError('')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || restoring) return
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password, orgSlug.trim().toLowerCase())
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
    } finally { setLoading(false) }
  }

  return <main className="entry-shell">
    <section className="entry-intro" aria-label="About BrandGuard">
      <div className="entry-top"><BrandGuardLogo size={38} color="white" className="text-white" /><span>THE BRAND TRUTH WORKSPACE <span className="entry-star">✳</span></span></div>
      <div className="entry-intro-content"><div className="entry-index"><span>01 / A MORE THOUGHTFUL WORKFLOW</span><span>↘</span></div>
        <h1>Know what changed.<br /><em>Decide what’s next.</em></h1>
        <p>Know which content depends on your approved facts, examine the evidence and keep a person in control of every decision.</p>
        <div className="entry-orbit" aria-hidden="true"><span className="entry-orbit-ring ring-one" /><span className="entry-orbit-ring ring-two" /><span className="entry-orbit-core"><ShieldCheck size={42} strokeWidth={1.2} /></span><span className="entry-orbit-label label-facts">01 / FACTS <ArrowUpRight size={14} /></span><span className="entry-orbit-label label-people">02 / PEOPLE <ArrowUpRight size={14} /></span><span className="entry-orbit-label label-decisions">03 / DECISIONS <ArrowUpRight size={14} /></span></div>
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
      {IS_DEMO_MODE && <section className="persona-section" aria-label="Demo personas"><div className="persona-heading"><div><span>01 / GET STARTED</span><h3>Pick a perspective.</h3></div><span className="persona-badge">FICTIONAL DEMO</span></div><p>Choose a persona to fill in the corresponding seeded role account.</p>
        <div className="persona-grid">{DEMO_ACCOUNTS.map((account, i) => { const persona = personas[account.role]; return <button className={`persona-card persona-color-${i} ${selected === account.role ? 'is-selected' : ''}`} type="button" key={account.role} onClick={() => choosePersona(account.role, account.email)} aria-pressed={selected === account.role} disabled={loading || restoring}>
          <span className="persona-avatar">{persona.initials}</span><span className="persona-copy"><strong>{persona.name}</strong><small>{account.label}</small></span><ArrowUpRight className="persona-arrow" size={16} /><span className="persona-description">{persona.description}</span>
        </button> })}</div><p className="persona-note">Names are illustrative; access uses the existing NimbusDesk role accounts.</p></section>}
      <section className="entry-form-section"><div className="persona-heading"><div><span>02 / YOUR DETAILS</span><h3>{selected ? 'Ready when you are.' : 'Sign in to continue.'}</h3></div><ShieldCheck size={21} /></div>
        {error && <div className="login-error" role="alert"><strong>Couldn’t sign in.</strong> {error}{selected && <p>Demo credentials must match the password used to seed the backend. You can edit the password below and try again.</p>}</div>}
        <form onSubmit={handleSubmit} className="entry-form"><div className="entry-form-row"><div><label htmlFor="login-org">Workspace slug</label><input id="login-org" name="organization" autoComplete="organization" value={orgSlug} onChange={e => setOrgSlug(e.target.value)} required /></div><div><label htmlFor="login-email">Email address</label><input id="login-email" name="email" type="email" autoComplete="username" value={email} onChange={e => { setEmail(e.target.value); setSelected(null) }} placeholder="you@example.com" required /></div></div>
          <div><label htmlFor="login-password">Password</label><div className="entry-password"><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <button className="entry-submit" type="submit" disabled={loading || restoring}><span>{restoring ? 'Checking session…' : loading ? 'Signing in…' : selected ? `Continue as ${personas[selected].name}` : 'Sign in to workspace'}</span><ArrowRight size={18} /></button>
        </form><p className="entry-disclaimer">Demo sign-in requires a running backend and matching seeded credentials. AI is a risk perspective, not legal advice. A human makes every decision.</p>
      </section></div>
    </section>
  </main>
}
