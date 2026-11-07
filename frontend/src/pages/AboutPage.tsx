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
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-accent text-white">
              <User size={28} />
            </div>
            <div>
              <p className="font-semibold text-main text-lg flex items-center gap-1.5">
                Builder <Sparkles size={14} className="text-accent" />
              </p>
              <p className="text-sm text-muted">
                Fourth-year Integrated M.Tech · Software Engineering · VIT
              </p>
            </div>
          </div>
          <div className="space-y-4 text-muted leading-relaxed">
            <p>
              A fourth-year Integrated M.Tech student in Software Engineering at Vellore Institute of
              Technology (VIT), driven by curiosity and a constant desire to explore beyond the
              familiar. I enjoy stepping into unfamiliar domains, connecting ideas, questioning
              conventional approaches, and turning possibilities into practical solutions. I
              believe growth begins where familiarity ends, and I'm always eager to learn,
              experiment, collaborate, and bring fresh perspectives to the table.
            </p>
            <p>
              Looking forward to meeting fellow innovators, exchanging ideas, learning from diverse
              perspectives, and collaborating with the community. Excited to see what we can
              imagine, explore, and build together!
            </p>
          </div>
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
