import React from 'react'
import { Rocket, User, Sparkles, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../theme'

const futureWork = [
  {
    title: 'Calibrated semantic retrieval',
    desc: 'Generate and evaluate compatible embeddings, then validate retrieval on representative labelled examples. The existing optional pgvector path is off by default and uncalibrated.',
  },
  {
    title: 'Broader automated rule testing',
    desc: 'Extend checker-backed tests and regression comparisons across rule families. Human review sets already support saved and reviewer-supplied examples.',
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
      <section>
        <h1 className={`text-main text-3xl ${heading}`}>About BrandGuard</h1>
        <p className="text-muted max-w-3xl mt-3 leading-relaxed">A governance prototype that connects approved facts and rules to registered content. A person reviews findings and decides; the system never publishes or applies changes automatically.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          <div className="p-5 rounded-xl glass-panel"><h2 className="font-semibold text-main">Blast Radius</h2><p className="text-sm text-muted mt-2">Explore registered-content matches and fact-to-channel graph paths. Possible matches need review; a graph snapshot is not proof that content is stale or published.</p></div>
          <div className="p-5 rounded-xl glass-panel"><h2 className="font-semibold text-main">Red Team</h2><p className="text-sm text-muted mt-2">Four perspectives provide Possible findings with checked references. Demo repetition is not a reliability measurement, and Legal Eagle is not legal advice.</p></div>
          <div className="p-5 rounded-xl glass-panel"><h2 className="font-semibold text-main">Rule testing</h2><p className="text-sm text-muted mt-2">Review possible contradictions, coverage gaps and human-labelled cases. Automated checker tests cover only selected seeded rules.</p></div>
        </div>
        <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900"><strong>Current AI mode:</strong> hosted model calls are disabled until a monetary spending cap is enforced. Demo heuristics are not AI. Optional vector matching is off by default and uncalibrated.</div>
      </section>
      {/* Future work */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Rocket size={20} className="text-accent" />
          <h2 className={`text-main text-3xl ${heading}`}>Future Work</h2>
        </div>
        <p className="text-muted max-w-3xl mb-7 leading-relaxed">
          Remaining work and ideas for further validation. These are not claims of production readiness.
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
