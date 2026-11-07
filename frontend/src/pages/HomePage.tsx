import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  FileText,
  Crosshair,
  ShieldAlert,
  Atom,
  Scale,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../auth'
import { useTheme } from '../theme'

const features = [
  {
    to: '/dashboard',
    Icon: LayoutDashboard,
    title: 'Executive Scorecard',
    desc: 'A real-time governance posture across every registered content asset — KPIs, finding exposure, and recent activity at a glance.',
  },
  {
    to: '/repository',
    Icon: Database,
    title: 'Fact & Rule Repository',
    desc: 'Approved facts and brand governance rules with full version history, expiry tracking, and separation-of-duties approval workflows.',
  },
  {
    to: '/content',
    Icon: FileText,
    title: 'Content Review',
    desc: 'Submit text or upload PDF/DOCX. BrandGuard extracts every factual claim deterministically, then runs an adversarial Red Team.',
  },
  {
    to: '/blast-radius',
    Icon: Crosshair,
    title: 'Blast Radius',
    desc: 'When a fact changes, instantly see every content asset that references the old value — split into Confirmed and Possible matches.',
  },
  {
    to: '/findings',
    Icon: ShieldAlert,
    title: 'Findings & Decisions',
    desc: 'Review findings, read a Prosecutor-vs-Defender debate for each one, then decide: accept, edit, dismiss, or escalate. No auto-fixes.',
  },
  {
    to: '/rule-tests',
    Icon: Atom,
    title: 'Chaos Lab',
    desc: 'Test tone rules for ambiguity with multiple AI interpreters. Low agreement means the rule needs clarification — not the content.',
  },
]

const steps = [
  {
    n: '01',
    title: 'Build your fact repository',
    desc: 'Add approved facts with version history, expiry dates, and separation-of-duties approval so nothing slips in without a second pair of eyes.',
  },
  {
    n: '02',
    title: 'Submit content for analysis',
    desc: 'Paste text or upload a document. BrandGuard extracts every factual claim and checks each one against your approved facts and rules.',
  },
  {
    n: '03',
    title: 'Review findings & decide',
    desc: 'See exactly what is wrong, read both sides of the debate, then accept, edit, dismiss, or escalate. Full audit trail — a human decides.',
  },
]

export default function HomePage() {
  const { user } = useAuth()
  const { isAuthority } = useTheme()
  const navigate = useNavigate()

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-10 pb-16 space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl glass-panel p-8 md:p-12">
        <div
          className="absolute -top-12 -right-12 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: isAuthority ? '#2a7f8e' : '#7e69ab' }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-accent mb-4">
            <Sparkles size={13} /> Intelligent operating system for brand truth
          </span>
          <h1
            className={`text-main max-w-2xl ${
              isAuthority ? 'font-newsreader text-4xl md:text-5xl' : 'font-jakarta text-4xl md:text-5xl font-extrabold'
            } leading-tight`}
          >
            Keep every brand claim accurate.
          </h1>
          <p className="text-muted text-base md:text-lg mt-4 max-w-2xl leading-relaxed">
            BrandGuard automatically checks marketing content against your approved fact
            repository — catching stale statistics, wrong prices, and embargo violations
            before they go live. Built for marketing, legal, and compliance teams.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold bg-accent hover:opacity-90 transition-opacity"
            >
              Go to Scorecard <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/content')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-accent text-sm font-semibold border border-accent/30 hover:bg-accent-subtle transition-colors"
            >
              Try Content Review
            </button>
          </div>
          {user && (
            <p className="text-xs text-muted mt-6">
              Signed in as <span className="font-medium text-main">{user.displayName}</span>
            </p>
          )}
        </div>
      </section>

      {/* What it's for */}
      <section>
        <h2
          className={`text-main text-2xl mb-2 ${
            isAuthority ? 'font-newsreader' : 'font-jakarta font-bold'
          }`}
        >
          What it is for
        </h2>
        <p className="text-muted max-w-3xl leading-relaxed">
          Marketing teams move fast and claims spread across packaging, ads, social, and sales
          collateral. BrandGuard gives you a single source of truth for every fact and rule your
          brand publishes against, then continuously verifies that live content still matches.
          When a number changes, you see the blast radius. When content is submitted, an
          adversarial review flags risks before publication. Every decision is human, audited, and
          explainable.
        </p>
      </section>

      {/* Features grid */}
      <section>
        <h2
          className={`text-main text-2xl mb-6 ${
            isAuthority ? 'font-newsreader' : 'font-jakarta font-bold'
          }`}
        >
          All the features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <button
              key={f.to}
              onClick={() => navigate(f.to)}
              className="text-left p-5 rounded-xl glass-panel transition-all hover:-translate-y-1 group"
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center bg-accent-subtle text-accent"
                >
                  <f.Icon size={20} strokeWidth={1.75} />
                </span>
                <ArrowRight
                  size={16}
                  className="text-muted/40 group-hover:text-accent transition-colors"
                />
              </div>
              <h3 className="font-semibold text-main mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2
          className={`text-main text-2xl mb-6 ${
            isAuthority ? 'font-newsreader' : 'font-jakarta font-bold'
          }`}
        >
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((s) => (
            <div key={s.n} className="p-5 rounded-xl glass-panel">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-9 h-9 rounded-lg flex items-center justify-center bg-accent text-white font-mono-numbers text-sm font-bold">
                  <Scale size={16} />
                </span>
                <span className="font-mono-numbers text-xs text-muted font-semibold">
                  {s.n}
                </span>
              </div>
              <h3 className="font-semibold text-main mb-1.5">{s.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="rounded-2xl glass-panel p-8 text-center">
        <h3 className={`text-main text-xl mb-2 ${isAuthority ? 'font-newsreader' : 'font-jakarta font-bold'}`}>
          Ready to verify your claims?
        </h3>
        <p className="text-muted text-sm mb-5 max-w-xl mx-auto">
          Jump into the scorecard to see your governance posture, or start reviewing content.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold bg-accent hover:opacity-90"
          >
            Open Scorecard
          </button>
          <button
            onClick={() => navigate('/about')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-accent text-sm font-semibold border border-accent/30 hover:bg-accent-subtle"
          >
            Future work & about
          </button>
        </div>
      </section>
    </div>
  )
}
