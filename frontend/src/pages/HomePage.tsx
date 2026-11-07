import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Crosshair,
  ShieldAlert,
  Atom,
  LayoutDashboard,
  Database,
  FileText,
  ArrowRight,
  CheckCircle2,
  Users,
  Zap,
} from 'lucide-react'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import BrandGuardLogo from '../components/BrandGuardLogo'

// ─── The three innovations — each gets its own accent colour ─────────────────

const innovations = [
  {
    to: '/blast-radius',
    Icon: Crosshair,
    badge: 'Blast-Radius Intelligence',
    tagline: 'See every asset affected when a key fact changes',
    desc: 'Confirmed and possible matches, sorted by urgency — published content first. No changes applied automatically.',
    accent: '#0ea5e9',    // sky-500
    bg: '#f0f9ff',        // sky-50
    border: '#bae6fd',    // sky-200
    iconBg: '#0ea5e920',
  },
  {
    to: '/content',
    Icon: ShieldAlert,
    badge: 'Adversarial Red Team',
    tagline: '3 AI personas review your content',
    desc: 'Prosecutor vs Defender shows both sides. Brand Police, Legal Eagle, Customer Voice. You decide — the system never does.',
    accent: '#e11d48',    // rose-600
    bg: '#fff1f2',        // rose-50
    border: '#fecdd3',    // rose-200
    iconBg: '#e11d4820',
  },
  {
    to: '/rule-tests',
    Icon: Atom,
    badge: 'Guideline Chaos Testing',
    tagline: 'Find ambiguity in tone rules before they cause problems',
    desc: 'Five independent interpreters per case. Low agreement = the rule needs clarification, not the content. Human labels are ground truth.',
    accent: '#7c3aed',    // violet-600
    bg: '#faf5ff',        // violet-50
    border: '#ddd6fe',    // violet-200
    iconBg: '#7c3aed20',
  },
]

// ─── All features (smaller grid) ─────────────────────────────────────────────

const features = [
  { to: '/dashboard',    Icon: LayoutDashboard, title: 'Executive Scorecard',   color: '#2a7f8e', desc: 'KPIs, finding exposure, pending approvals — at a glance.' },
  { to: '/repository',   Icon: Database,        title: 'Fact Repository',        color: '#15803d', desc: 'Version history, expiry tracking, separation-of-duties approvals.' },
  { to: '/content',      Icon: FileText,        title: 'Content Review',         color: '#1d4ed8', desc: 'Paste or upload. Every claim extracted and checked deterministically.' },
  { to: '/blast-radius', Icon: Crosshair,       title: 'Blast Radius',           color: '#0ea5e9', desc: 'Impact analysis when a fact value changes.' },
  { to: '/findings',     Icon: ShieldAlert,     title: 'Findings & Decisions',   color: '#e11d48', desc: 'Accept, edit, dismiss, or escalate. Full audit trail.' },
  { to: '/rule-tests',   Icon: Atom,            title: 'Chaos Lab',              color: '#7c3aed', desc: 'Tone-rule ambiguity testing with multi-reader agreement scores.' },
]

// ─── How it works steps ───────────────────────────────────────────────────────

const steps = [
  { n: 1, Icon: Database,   title: 'Build your fact repository',    desc: 'Add approved facts with version history, expiry dates, and approval workflows.' },
  { n: 2, Icon: FileText,   title: 'Submit content for analysis',   desc: 'Paste text or upload a document. Every factual claim is extracted and checked.' },
  { n: 3, Icon: CheckCircle2, title: 'Review findings & decide',   desc: 'See both sides of every debate, then decide. A human always makes the call.' },
]

export default function HomePage() {
  const { user } = useAuth()
  const { isAuthority } = useTheme()
  const navigate = useNavigate()

  const headingCls = isAuthority
    ? 'font-newsreader text-3xl'
    : 'font-jakarta text-3xl font-bold'

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 pb-20 space-y-16">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section
        className="relative rounded-2xl overflow-hidden mt-6"
        style={{
          background: isAuthority
            ? 'linear-gradient(135deg, #0f2d4a 0%, #1f3a5f 40%, #0a4a50 100%)'
            : 'linear-gradient(135deg, #2d1b69 0%, #5b4a8c 40%, #7e69ab 100%)',
        }}
      >
        {/* Decorative orbs */}
        <div
          className="absolute -top-16 -right-16 w-72 h-72 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ background: isAuthority ? '#0ea5e9' : '#a78bfa' }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: isAuthority ? '#2a7f8e' : '#ec4899' }}
        />

        <div className="relative z-10 px-8 md:px-12 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-center gap-10">
            {/* Left */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <BrandGuardLogo size={40} color="white" showText={false} />
                <div>
                  <p className="text-white font-newsreader font-bold text-xl leading-tight">BrandGuard</p>
                  <p className="text-white/50 text-xs">& Risk Governance</p>
                </div>
              </div>

              <h1 className="text-white font-newsreader text-4xl md:text-5xl font-bold leading-tight mb-4">
                Keep every<br />
                <span
                  style={{ color: isAuthority ? '#5eead4' : '#f5d0fe' }}
                >
                  brand claim
                </span>{' '}
                accurate.
              </h1>

              <p className="text-white/70 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
                BrandGuard automatically checks marketing content against your approved fact
                repository — catching stale statistics, wrong prices, and embargo violations
                before they go live.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: isAuthority ? '#2a7f8e' : '#7e69ab', color: '#fff' }}
                >
                  Open Scorecard <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => navigate('/content')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:bg-white/10"
                  style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)' }}
                >
                  Try Content Review
                </button>
              </div>

              {user && (
                <p className="text-white/40 text-xs mt-5">
                  Signed in as <span className="text-white/70 font-medium">{user.displayName}</span>
                </p>
              )}
            </div>

            {/* Right — stat pills */}
            <div className="flex md:flex-col gap-3 flex-wrap md:flex-nowrap md:min-w-[200px]">
              {[
                { icon: '💥', label: 'Blast Radius', sub: 'Impact analysis' },
                { icon: '🎯', label: 'Red Team',     sub: '3 AI personas' },
                { icon: '🧪', label: 'Chaos Lab',    sub: 'Rule testing' },
              ].map((pill) => (
                <div
                  key={pill.label}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <span className="text-2xl leading-none">{pill.icon}</span>
                  <div>
                    <p className="text-white text-sm font-semibold leading-tight">{pill.label}</p>
                    <p className="text-white/50 text-xs">{pill.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Three innovations — big coloured cards ────────────────────────── */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-5">
          Three innovations
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {innovations.map((inn) => (
            <button
              key={inn.to}
              onClick={() => navigate(inn.to)}
              className="text-left rounded-2xl p-6 border transition-all hover:-translate-y-1 group"
              style={{ background: inn.bg, borderColor: inn.border }}
            >
              {/* Icon + badge row */}
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: inn.iconBg }}
                >
                  <inn.Icon size={22} style={{ color: inn.accent }} strokeWidth={1.75} />
                </span>
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: inn.accent }}
                >
                  {inn.badge}
                </span>
              </div>

              {/* Tagline */}
              <h3 className="font-semibold text-main text-base mb-2 leading-snug">
                {inn.tagline}
              </h3>

              {/* Desc */}
              <p className="text-sm text-muted leading-relaxed mb-4">{inn.desc}</p>

              {/* Explore link */}
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold transition-all group-hover:gap-2"
                style={{ color: inn.accent }}
              >
                Explore <ArrowRight size={13} />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── What it is for ───────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className={`text-main mb-3 ${headingCls}`}>What it is for</h2>
          <p className="text-muted leading-relaxed">
            Marketing teams move fast and claims spread across packaging, ads, social, and
            sales collateral. BrandGuard gives you a single source of truth for every fact and
            rule your brand publishes against, then continuously verifies that live content still
            matches.
          </p>
          <p className="text-muted leading-relaxed mt-3">
            When a number changes, you see the blast radius. When content is submitted, an
            adversarial review flags risks before publication. Every decision is human, audited,
            and explainable.
          </p>
        </div>

        {/* Mini stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Human decides',   icon: Users,         color: '#2a7f8e', sub: 'No auto-fixes ever' },
            { label: 'Deterministic',   icon: CheckCircle2,  color: '#15803d', sub: 'Fact-based checks' },
            { label: 'Adversarial AI',  icon: ShieldAlert,   color: '#e11d48', sub: '3 persona review' },
            { label: 'Full audit trail', icon: Zap,          color: '#7c3aed', sub: 'Every decision logged' },
          ].map((s) => (
            <div key={s.label} className="glass-panel rounded-xl p-4">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                style={{ background: `${s.color}18`, color: s.color }}
              >
                <s.icon size={16} />
              </span>
              <p className="text-sm font-semibold text-main leading-tight">{s.label}</p>
              <p className="text-xs text-muted mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── All features grid ─────────────────────────────────────────────── */}
      <section>
        <h2 className={`text-main mb-6 ${headingCls}`}>All features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <button
              key={f.to}
              onClick={() => navigate(f.to)}
              className="text-left p-5 rounded-xl glass-panel transition-all hover:-translate-y-0.5 group flex gap-4 items-start"
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${f.color}18`, color: f.color }}
              >
                <f.Icon size={18} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h3 className="font-semibold text-main text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
              </div>
              <ArrowRight size={14} className="text-muted/30 group-hover:text-accent transition-colors flex-shrink-0 mt-1" />
            </button>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section>
        <h2 className={`text-main mb-8 ${headingCls}`}>How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 relative">
          {/* Connector line (desktop only) */}
          <div
            className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] h-px"
            style={{ background: 'linear-gradient(90deg, var(--primary-accent), transparent 50%, var(--primary-accent))' , opacity: 0.2 }}
          />

          {steps.map((s, i) => (
            <div key={s.n} className={`relative flex flex-col items-start p-6 ${i < steps.length - 1 ? 'md:pr-8' : ''}`}>
              {/* Step number circle */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-4 z-10"
                style={{
                  background: `linear-gradient(135deg, var(--primary-accent), ${isAuthority ? '#0ea5e9' : '#a78bfa'})`,
                  boxShadow: '0 4px 20px -4px var(--primary-accent)',
                }}
              >
                <s.Icon size={22} className="text-white" strokeWidth={1.75} />
              </div>
              <div
                className="absolute top-[2.6rem] left-[3.15rem] w-6 h-6 rounded-full flex items-center justify-center -mt-1 z-20"
                style={{ background: 'var(--canvas-bg)', border: '2px solid var(--primary-accent)' }}
              >
                <span className="text-[10px] font-bold text-accent">{s.n}</span>
              </div>

              <h3 className="font-semibold text-main mt-2 mb-1.5">{s.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────────────── */}
      <section
        className="rounded-2xl p-8 md:p-10 text-center relative overflow-hidden"
        style={{
          background: isAuthority
            ? 'linear-gradient(135deg, #0f2d4a 0%, #1f3a5f 100%)'
            : 'linear-gradient(135deg, #2d1b69 0%, #5b4a8c 100%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.2) 0%, transparent 50%)',
          }}
        />
        <div className="relative z-10">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Get started</p>
          <h3 className="text-white font-newsreader text-2xl md:text-3xl font-bold mb-3">
            Ready to verify your claims?
          </h3>
          <p className="text-white/60 text-sm mb-6 max-w-lg mx-auto">
            Jump into the scorecard to see your governance posture, or start reviewing content. A human makes every decision.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: isAuthority ? '#2a7f8e' : '#7e69ab' }}
            >
              Open Scorecard <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/about')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.8)' }}
            >
              About & future work
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}
