import React from 'react'
import { Rocket, User, Sparkles, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../theme'

const futureWork = [
  {
    title: 'Semantic “possible” matching',
    desc: 'Move beyond exact numeric matches to embedding-based similarity (pgvector RAG) so the Blast Radius catches paraphrased claims too.',
  },
  {
    title: 'Auto-generated rule clarifications',
    desc: 'Use human labels from the Chaos Lab to suggest concrete rewrites for ambiguous tone rules, closing the loop automatically.',
  },
  {
    title: 'Scheduled re-verification',
    desc: 'Periodically re-scan published content so newly-changed facts surface stale claims before customers notice.',
  },
  {
    title: 'Multi-language claim extraction',
    desc: 'Extract and verify factual claims across languages for global brands running regional campaigns.',
  },
  {
    title: 'Org-wide policy templates & SLAs',
    desc: 'Reusable rule bundles per market and SLA dashboards tracking time-to-decision per finding.',
  },
  {
    title: 'SSO / SAML & granular roles',
    desc: 'Enterprise identity and finer-grained permissions beyond the current six roles, with full audit export.',
  },
]

export default function AboutPage() {
  const { isAuthority } = useTheme()
  const navigate = useNavigate()

  const heading = isAuthority ? 'font-newsreader' : 'font-jakarta font-bold'

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-10 pb-16 space-y-12">
      {/* Future work */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Rocket size={20} className="text-accent" />
          <h1 className={`text-main text-3xl ${heading}`}>Future Work</h1>
        </div>
        <p className="text-muted max-w-3xl mb-7 leading-relaxed">
          Where BrandGuard is headed next. These are the capabilities planned to take it from a
          hackathon prototype to a production-grade governance platform.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {futureWork.map((f, i) => (
            <div key={f.title} className="p-5 rounded-xl glass-panel">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-accent-subtle text-accent font-mono-numbers text-xs font-bold">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-semibold text-main">{f.title}</h3>
              </div>
              <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About me */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <User size={20} className="text-accent" />
          <h2 className={`text-main text-3xl ${heading}`}>About Me</h2>
        </div>
        <div className="p-8 rounded-2xl glass-panel">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-accent text-white">
              <User size={28} />
            </div>
            <div>
              <p className="font-semibold text-main text-lg">Your name here</p>
              <p className="text-sm text-muted">Builder of BrandGuard</p>
            </div>
          </div>
          {/* About-me content placeholder — the author will provide this. */}
          <div className="border border-dashed border-subtle rounded-xl p-6 text-center">
            <Sparkles size={20} className="text-accent mx-auto mb-2" />
            <p className="text-sm text-muted">
              About-me content coming soon. The author will provide a bio here — background, role,
              what they built this for, and how to reach them.
            </p>
          </div>
          <p className="text-xs text-muted/70 mt-4 italic">
            (Replace this placeholder with your about-me content when ready.)
          </p>
        </div>
      </section>

      {/* Back CTA */}
      <section className="text-center">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-accent text-sm font-semibold border border-accent/30 hover:bg-accent-subtle"
        >
          <ArrowRight size={16} className="rotate-180" /> Back to home
        </button>
      </section>
    </div>
  )
}
