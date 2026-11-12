import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, GitBranch, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '../auth'
import BrandGuardLogo from '../components/BrandGuardLogo'
import { DEMO_ACCOUNTS, ORG_SLUG, DEMO_PASSWORD, IS_DEMO_MODE } from '../lib/demoAccounts'

export default function LoginPage() {
  const { login, user, loading: restoring } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgSlug, setOrgSlug] = useState(ORG_SLUG)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  async function signIn(accountEmail: string, accountPassword: string, organisation: string) {
    if (loading || restoring) return
    setError('')
    setLoading(true)
    try {
      await login(accountEmail, accountPassword, organisation)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password || !orgSlug.trim()) {
      setError('Enter your workspace slug, email and password.')
      return
    }
    void signIn(email.trim(), password, orgSlug.trim().toLowerCase())
  }

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="About BrandGuard">
        <BrandGuardLogo size={38} color="white" className="login-story-logo" />
        <div className="login-story-content">
          <p className="login-kicker"><Sparkles size={14} /> A LITTLE MORE CLARITY</p>
          <h1>Better brand work<br /><em>starts here.</em></h1>
          <p className="login-story-description">A thoughtful space for your facts, content and guidelines—and the people who bring them to life.</p>
          <div className="login-story-cards">
            <div><span><GitBranch size={19} /></span><p><strong>See the connections</strong><small>Explore how facts and content relate.</small></p></div>
            <div><span><ShieldCheck size={19} /></span><p><strong>Stay in control</strong><small>Review the evidence and make the call.</small></p></div>
          </div>
        </div>
        <p className="login-story-footer">BRAND TRUTH, WITH A HUMAN TOUCH <span>✳</span></p>
      </section>
      <section className="login-main" aria-label="Sign in">
        <div className="login-mobile-logo"><BrandGuardLogo size={34} /></div>
        <div className="login-content">
          <div className="login-heading-icon"><ShieldCheck size={22} /></div>
          <p className="login-overline">YOUR WORKSPACE AWAITS</p>
          <h2>Welcome back<span>.</span></h2>
          <p className="login-subtitle">Sign in to continue to your BrandGuard workspace.</p>
          {error && <div className="login-error" role="alert">{error}</div>}
          <form onSubmit={handleSubmit} className="login-form">
            <div><label htmlFor="login-org">Workspace slug</label><input id="login-org" name="organization" autoComplete="organization" value={orgSlug} onChange={event => setOrgSlug(event.target.value)} placeholder="e.g. nimbusdesk" required /></div>
            <div><label htmlFor="login-email">Email address</label><input id="login-email" name="email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required /></div>
            <div><label htmlFor="login-password">Password</label><div className="login-password"><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            <button className="login-submit" type="submit" disabled={loading || restoring}>{restoring ? 'Checking session…' : loading ? 'Signing in…' : 'Sign in to workspace'} {!loading && !restoring && <ArrowRight size={17} />}</button>
          </form>
          {IS_DEMO_MODE && <div className="login-demo">
            <div className="login-demo-title"><span><Sparkles size={16} /></span><div><strong>Explore the demo</strong><p>Sign in to the fictional NimbusDesk workspace.</p></div></div>
            <div className="login-demo-roles">{DEMO_ACCOUNTS.map(account => <button key={account.role} type="button" disabled={loading || restoring} onClick={() => void signIn(account.email, DEMO_PASSWORD, ORG_SLUG)}>{account.label}<ArrowRight size={13} /></button>)}</div>
            <p className="login-demo-note">Demo sign-in requires a running backend seeded with matching demo credentials.</p>
          </div>}
          <p className="login-disclaimer">AI provides a risk perspective, not legal advice.<br />A human makes every decision.</p>
        </div>
      </section>
    </main>
  )
}
