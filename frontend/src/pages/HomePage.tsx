import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Atom, Check, CircleHelp,
  Database, FileText, GitBranch, Layers3,
  ScanSearch, ShieldCheck, ShieldEllipsis, Sparkles, UsersRound,
} from 'lucide-react'
import { useAuth } from '../auth'
import { IS_DEMO_MODE } from '../lib/demoAccounts'

const pillars = [
  {
    number: '01', icon: GitBranch, label: '01 / TRACE',
    title: 'Brand-as-Code with Blast-Radius Intelligence',
    text: 'Trace connections between approved facts, claims, content and channels. Review confirmed and possible matches separately.',
    link: '/blast-radius', action: 'Explore blast radius', tone: 'mint',
  },
  {
    number: '02', icon: ShieldEllipsis, label: '02 / CHALLENGE',
    title: 'Adversarial Brand Red Team',
    text: 'Review evidence-backed concerns from four perspectives, compare repeated findings, and make the final call yourself.',
    link: '/content', action: 'Review content', tone: 'peach',
  },
  {
    number: '03', icon: Atom, label: '03 / TEST',
    title: 'Guideline Chaos Testing',
    text: 'Explore potential rule conflicts and gaps, and test how interpretations differ. Agreement is consistency, not correctness.',
    link: '/rule-tests', action: 'Explore rule tests', tone: 'lilac',
  },
]

const destinations = [
  { icon: Database, title: 'Repository', desc: 'Your approved facts and rules.', to: '/repository', tag: 'THE SOURCE' },
  { icon: FileText, title: 'Content', desc: 'Bring a draft in for review.', to: '/content', tag: 'THE WORK' },
  { icon: ScanSearch, title: 'Findings', desc: 'Review evidence and decide.', to: '/findings', tag: 'THE DECISION' },
  { icon: Layers3, title: 'Scorecard', desc: 'See your workspace at a glance.', to: '/dashboard', tag: 'THE OVERVIEW' },
]

function Illustration() {
  return (
    <div className="home-illustration" aria-label="Illustration of a fact connected to content and review" role="img">
      <div className="illustration-grid" />
      <div className="illustration-label"><span /> HOW IT CONNECTS</div>
      <svg className="illustration-lines" viewBox="0 0 450 330" aria-hidden="true">
        <path d="M185 113 C245 113 238 79 288 79" />
        <path d="M185 113 C245 113 239 193 286 193" />
        <path d="M288 79 C379 79 366 249 315 249" />
        <circle cx="185" cy="113" r="4" /><circle cx="288" cy="79" r="4" />
        <circle cx="286" cy="193" r="4" /><circle cx="315" cy="249" r="4" />
      </svg>
      <div className="diagram-card diagram-fact"><span className="diagram-icon"><Database size={17} /></span><span><small>YOUR SOURCE</small><strong>Approved fact</strong></span><Check size={14} className="diagram-check" /></div>
      <div className="diagram-card diagram-claim"><span className="diagram-icon amber"><FileText size={17} /></span><span><small>CONNECTED</small><strong>Content claim</strong></span></div>
      <div className="diagram-card diagram-review"><span className="diagram-icon violet"><ScanSearch size={17} /></span><span><small>HUMAN REVIEW</small><strong>Review evidence</strong></span></div>
      <div className="diagram-note"><ShieldCheck size={16} /><span>People make the final decision.</span></div>
      <span className="diagram-caption">ILLUSTRATIVE WORKFLOW</span>
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuth()
  return (
    <div className="home-page workspace-container">
      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="home-eyebrow"><span className="eyebrow-dot" /> YOUR BRAND TRUTH WORKSPACE <span className="eyebrow-line" /> <span>01 / 03</span></div>
          <p className="home-greeting">Welcome back{user?.displayName ? `, ${user.displayName}` : ''} <span>✳</span></p>
          <h1>Good content<br /><em>starts with truth.</em></h1>
          <p className="home-lede">Bring your facts, content and guidelines together—so your team can spot risks before they travel.</p>
          <div className="home-actions">
            <Link className="home-button home-button-primary" to="/content">Review content <ArrowRight size={17} /></Link>
            <Link className="home-button home-button-secondary" to="/repository">Explore your repository <ArrowUpRight size={16} /></Link>
          </div>
          <div className="hero-footnote"><ShieldCheck size={16} /> Human-led decisions. No automatic publishing or changes.</div>
        </div>
        <Illustration />
      </section>

      {IS_DEMO_MODE && <section className="home-journey" aria-label="Guided demo walkthrough">
        <div className="home-journey-heading"><div><p className="section-kicker"><span>✳</span> START HERE</p><h2>See the workflow in action.</h2></div><p>A short, human-led walkthrough of the fictional NimbusDesk workspace.</p></div>
        <div className="home-journey-grid">
          <Link to="/repository"><span>01 / APPROVE</span><strong>Change an approved fact</strong><small>Submit a version, then switch to a different approver.</small><ArrowUpRight size={17} /></Link>
          <Link to="/blast-radius"><span>02 / TRACE</span><strong>Explore the impact</strong><small>Scan registered content and review possible matches.</small><ArrowUpRight size={17} /></Link>
          <Link to="/content"><span>03 / REVIEW</span><strong>Put a draft to the test</strong><small>Run the demo Red Team, inspect evidence and decide.</small><ArrowUpRight size={17} /></Link>
        </div>
        <p className="home-journey-note"><ShieldCheck size={15} /> Hosted AI is currently disabled; demo interpretations use heuristics. Only registered content is scanned.</p>
      </section>}

      <section className="home-section">
        <div className="home-section-heading"><div><p className="section-kicker"><span>✳</span> THE BRANDGUARD TOOLKIT</p><h2>Confidence, at every step.</h2></div><p>From a single source of truth to a clearer decision.</p></div>
        <div className="pillar-grid">
          {pillars.map(({ number, icon: Icon, label, title, text, link, action, tone }) => (
            <Link to={link} className={`pillar-card pillar-${tone}`} key={number}>
              <div className="pillar-top"><span className="pillar-icon"><Icon size={23} strokeWidth={1.7} /></span><span className="pillar-number">{number} <ArrowUpRight size={15} /></span></div>
              <span className="pillar-label">{label}</span><h3>{title}</h3><p>{text}</p>
              <span className="pillar-link">{action} <ArrowRight size={15} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="workspace-section">
        <div className="workspace-intro"><p className="section-kicker"><span>✳</span> YOUR WORKSPACE</p><h2>Pick up where<br /><em>you need to.</em></h2><p>Everything you need to move from an approved fact to a thoughtful decision.</p><Link to="/about" className="workspace-about">How BrandGuard works <ArrowRight size={15} /></Link></div>
        <div className="destination-grid">{destinations.map(({ icon: Icon, title, desc, to, tag }) => <Link to={to} className="destination-card" key={to}>
          <div className="destination-top"><span className="destination-icon"><Icon size={19} /></span><ArrowUpRight size={17} className="destination-arrow" /></div>
          <span className="destination-tag">{tag}</span><h3>{title}</h3><p>{desc}</p>
        </Link>)}</div>
      </section>

      <section className="home-principles">
        <div className="principle-icon"><UsersRound size={20} /></div><div><span>BUILT FOR HUMAN JUDGMENT</span><p>Evidence informs the decision. <strong>You make it.</strong></p></div>
        <Link to="/about">Read limitations <ArrowUpRight size={16} /></Link>
      </section>
      <div className="home-endnote"><span><Sparkles size={14} /> Made for more thoughtful brand work</span><Link to="/about"><CircleHelp size={14} /> Help & limitations <ArrowDownRight size={13} /></Link></div>
    </div>
  )
}
