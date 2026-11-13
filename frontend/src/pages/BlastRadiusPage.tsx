import { markStep } from '../lib/demoProgress'
import DependencyGraph from '../components/DependencyGraph'
import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crosshair, Info, ExternalLink, Zap, Globe, Smartphone, Mail, FileText, ImageIcon, Newspaper } from 'lucide-react'
import { factsApi, Fact, BlastRadiusResult, AffectedItem } from '../api'
import { useTheme } from '../theme'
import StatusChip from '../components/StatusChip'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const channelIcon: Record<string, React.ReactNode> = {
  web:    <Globe    size={13} className="text-muted/70" />,
  social: <Smartphone size={13} className="text-muted/70" />,
  email:  <Mail     size={13} className="text-muted/70" />,
  press:  <Newspaper size={13} className="text-muted/70" />,
  pdf:    <FileText size={13} className="text-muted/70" />,
  image:  <ImageIcon size={13} className="text-muted/70" />,
}

type UrgencyGroup = 'published' | 'scheduled' | 'in_review' | 'draft'

function urgencyOf(item: AffectedItem): UrgencyGroup {
  if (item.registered_state === 'published') return 'published'
  if (item.registered_state === 'scheduled') return 'scheduled'
  if (item.status === 'in_review') return 'in_review'
  return 'draft'
}

const URGENCY_ORDER: UrgencyGroup[] = ['published', 'scheduled', 'in_review', 'draft']

const URGENCY_META: Record<UrgencyGroup, { label: string; dotColor: string; badgeTone: 'critical' | 'high' | 'review' | 'low' }> = {
  published: { label: 'Published — urgent',  dotColor: '#dc2626', badgeTone: 'critical' },
  scheduled: { label: 'Scheduled',            dotColor: '#ea580c', badgeTone: 'high'     },
  in_review: { label: 'In Review',            dotColor: '#1d4ed8', badgeTone: 'review'   },
  draft:     { label: 'Draft',                dotColor: '#64748b', badgeTone: 'low'      },
}

// ─── Ripple SVG diagram ────────────────────────────────────────────────────────

function RippleDiagram({
  result,
  onDotClick,
}: {
  result: BlastRadiusResult
  onDotClick: (id: string) => void
}) {
  const cx = 200
  const cy = 200
  const ringR = [60, 105, 145, 178] as const   // published, scheduled, in_review, draft
  const labelMap: Record<UrgencyGroup, string> = {
    published: 'Published',
    scheduled: 'Scheduled',
    in_review: 'In Review',
    draft: 'Draft',
  }

  const grouped: Record<UrgencyGroup, AffectedItem[]> = {
    published: [], scheduled: [], in_review: [], draft: [],
  }
  for (const item of result.affected) grouped[urgencyOf(item)].push(item)

  return (
    <div className="hidden md:block w-full">
      <svg
        viewBox="0 0 400 400"
        className="w-full max-w-sm mx-auto"
        aria-label="Blast radius ripple diagram"
        role="img"
      >
        <desc>
          {result.fact_label}: {result.affected_count} content item{result.affected_count !== 1 ? 's' : ''} affected.
          Rings from centre: Published (most urgent), Scheduled, In Review, Draft.
          Solid dots = confirmed match, hollow = possible.
        </desc>

        {/* Rings */}
        {URGENCY_ORDER.map((key, i) => (
          <circle
            key={key}
            cx={cx}
            cy={cy}
            r={ringR[i]}
            fill="none"
            stroke={grouped[key].length > 0 ? URGENCY_META[key].dotColor : '#e2e8f0'}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.4}
          />
        ))}

        {/* Ring labels */}
        {URGENCY_ORDER.map((key, i) => (
          <text
            key={`lbl-${key}`}
            x={cx + ringR[i] + 4}
            y={cy}
            fontSize={9}
            fill="#94a3b8"
            dominantBaseline="middle"
          >
            {labelMap[key]}
          </text>
        ))}

        {/* Centre fact node */}
        <circle cx={cx} cy={cy} r={22} fill="var(--primary-accent)" opacity={0.15} />
        <circle cx={cx} cy={cy} r={18} fill="var(--primary-accent)" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="white" fontWeight="bold">
          FACT
        </text>

        {/* Dots */}
        {URGENCY_ORDER.map((key, ri) => {
          const items = grouped[key]
          if (items.length === 0) return null
          return items.map((item, ii) => {
            const angle = (2 * Math.PI * ii) / items.length - Math.PI / 2
            const r = ringR[ri]
            const dx = cx + r * Math.cos(angle)
            const dy = cy + r * Math.sin(angle)
            const isConfirmed = item.match_type === 'confirmed'
            const col = URGENCY_META[key].dotColor
            return (
              <g
                key={item.content_item_id}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => onDotClick(item.content_item_id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onDotClick(item.content_item_id) }}
                aria-label={`${item.title} (${isConfirmed ? 'confirmed' : 'possible'})`}
              >
                <title>{item.title} — {isConfirmed ? 'Confirmed' : 'Possible'}</title>
                <circle
                  cx={dx}
                  cy={dy}
                  r={6}
                  fill={isConfirmed ? col : 'white'}
                  stroke={col}
                  strokeWidth={1.5}
                />
              </g>
            )
          })
        })}
      </svg>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function BlastRadiusPage() {
  const { isAuthority } = useTheme()
  const [facts, setFacts] = useState<Fact[]>([])
  const [factsLoading, setFactsLoading] = useState(true)
  const [selectedFactId, setSelectedFactId] = useState('')
  const [result, setResult] = useState<BlastRadiusResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    factsApi.list().then((fs) => {
      setFacts(fs)
      const cc = fs.find((f) => f.key === 'customer_count')
      if (cc) setSelectedFactId(cc.id)
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load facts.')).finally(() => setFactsLoading(false))
  }, [])

  const runScan = async () => {
    if (!selectedFactId) return
    setRunning(true)
    setError('')
    setResult(null)
    try {
      const r = await factsApi.blastRadius(selectedFactId)
      if (r.scan_performed !== false && r.run_id) markStep(3)
      setResult(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setRunning(false)
    }
  }

  const scrollToCard = (id: string) => {
    cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const selectedFact = facts.find((f) => f.id === selectedFactId)
  // Older API versions signal this condition via message rather than scan_performed.
  const noComparison = Boolean(result && (result.scan_performed === false || (!result.run_id && result.message)))
  const summary = result?.summary
  const confirmed = summary?.confirmed ?? result?.affected.filter((a) => a.match_type === 'confirmed').length ?? 0
  const possible  = summary?.possible  ?? result?.affected.filter((a) => a.match_type === 'possible').length  ?? 0

  const grouped: Record<UrgencyGroup, AffectedItem[]> = {
    published: [], scheduled: [], in_review: [], draft: [],
  }
  for (const item of (result?.affected ?? [])) grouped[urgencyOf(item)].push(item)

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto p-4 md:p-6 pb-12">
      <div>
        <h1 className={`text-main ${isAuthority ? 'font-newsreader text-3xl' : 'font-jakarta text-2xl font-bold'}`}>
          Brand-as-Code with Blast-Radius Intelligence
        </h1>
        <p className="text-sm text-muted mt-1">
          Explore registered content that may be affected when a fact changes.
        </p>
      </div>

      <DependencyGraph />

      {/* Control panel */}
      <div className="glass-panel rounded-xl p-5 md:p-6">
        <h2 className="text-sm font-semibold text-main mb-4 flex items-center gap-2">
          <Crosshair size={15} /> Configure Scan
        </h2>
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-muted mb-1" htmlFor="fact-select">
              Select fact
            </label>
            <select
              id="fact-select"
              value={selectedFactId}
              onChange={(e) => { setSelectedFactId(e.target.value); setResult(null) }}
              className="w-full px-3 py-2 border border-subtle rounded-lg text-sm focus:outline-none focus:border-accent bg-surface text-main"
            >
              <option value="">{factsLoading ? 'Loading facts…' : '— choose a fact —'}</option>
              {facts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} ({f.key}) – {f.value_text ?? '?'}
                </option>
              ))}
            </select>
          </div>
          <button
            data-demo-target="3" onClick={runScan}
            disabled={running || factsLoading || !selectedFactId}
            className="flex items-center gap-2 px-5 py-2 bg-accent text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scanning…
              </>
            ) : (
              <><Zap size={15} /> Run Blast Radius Scan</>
            )}
          </button>
        </div>
        {selectedFact && (
          <div className="mt-4 p-3 bg-accent-subtle rounded-lg text-xs text-accent border border-accent/20">
            <span className="font-mono">{selectedFact.key}</span> · Current approved value:{' '}
            <span className="font-semibold">{selectedFact.value_text}</span>
          </div>
        )}
      </div>

      {factsLoading && <div role="status" className="glass-panel rounded-xl p-5"><span className="sr-only">Loading facts…</span><div className="h-4 w-2/3 bg-canvas-secondary rounded animate-pulse" /></div>}
      {running && <div role="status" className="glass-panel rounded-xl p-5 space-y-3"><span>Scanning registered content…</span><div className="h-4 w-full bg-canvas-secondary rounded animate-pulse" /><div className="h-4 w-2/3 bg-canvas-secondary rounded animate-pulse" /></div>}
      {!factsLoading && !error && facts.length === 0 && <p className="text-sm text-muted">No facts available. Add an approved fact in the Repository to begin.</p>}
      {error && <div role="alert" className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      {result && noComparison && (
        <section className="glass-panel rounded-xl p-6" role="status">
          <h2 className="text-lg font-semibold text-main">No comparison available yet</h2>
          <p className="text-sm text-muted mt-2">{result.message || 'There is no previous approved version to compare.'} No scan was performed.</p>
          <p className="text-sm text-muted mt-2">To compare a change, submit a new fact version in the Repository and have a different authorised approver approve it. Then return here and run the scan.</p>
          <Link className="inline-flex mt-4 text-sm font-semibold text-accent underline" to="/repository">Go to Repository</Link>
        </section>
      )}
      {result && !noComparison && (
        <div className="space-y-5">
          {/* ── Header card ── */}
          <div className="glass-panel rounded-xl p-5">
            <h2 className="text-sm font-semibold text-main mb-3">{result.fact_label}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 font-mono text-xs text-red-700 line-through">
                {result.old_value}
              </span>
              <span className="text-muted text-lg">→</span>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 font-mono text-xs text-green-700 font-semibold">
                {result.new_value}
              </span>
            </div>
          </div>

          {/* ── Summary strip ── */}
          {result.affected_count > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="glass-panel rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-700 font-mono-numbers">{confirmed}</p>
                <p className="text-xs text-muted mt-0.5">Confirmed</p>
              </div>
              <div className="glass-panel rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-600 font-mono-numbers">{possible}</p>
                <p className="text-xs text-muted mt-0.5">Possible</p>
              </div>
              {(['published', 'scheduled', 'in_review', 'draft'] as const).map((key, i) => {
                const count = (summary?.by_status as Record<string, number>)?.[key] ?? grouped[key].length
                const colors = ['text-red-700', 'text-orange-600', 'text-blue-700', 'text-slate-600']
                const labels = ['Published', 'Scheduled', 'In Review', 'Draft']
                if (i < 2) return null  // already shown above via confirmed/possible
                return (
                  <div key={key} className="glass-panel rounded-xl p-4 text-center">
                    <p className={`text-2xl font-bold font-mono-numbers ${colors[i]}`}>{count}</p>
                    <p className="text-xs text-muted mt-0.5">{labels[i]}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Scope note */}
          {result.scope_note && (
            <div className="px-4 py-2 bg-slate-50 border border-subtle rounded-lg text-xs text-muted flex items-center gap-2">
              <Info size={14} className="flex-shrink-0 text-muted/60" />
              {result.scope_note}
            </div>
          )}

          {/* Match type explainer */}
          {result.affected_count > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
              <p><strong>Confirmed</strong> – exact numeric match AND the attribute matches. Needs updating.</p>
              <p><strong>Possible</strong> – a text or numeric match needs human review; it may be unrelated or still current.</p>
              <p className="text-blue-600 pt-1">No changes are applied automatically. A human must decide.</p>
            </div>
          )}

          {result.affected_count === 0 ? (
            <div className="text-center py-12 glass-panel rounded-xl">
              <Info size={32} className="text-accent mx-auto mb-3" />
              <p className="text-lg font-medium text-main">No matches found by this scan</p>
              {result.scope_note && <p className="text-sm text-muted mt-1 max-w-md mx-auto">{result.scope_note}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* ── Cards ── */}
              <div className="md:col-span-2 space-y-4">
                <p className="text-xs text-muted font-semibold uppercase tracking-wide">
                  Sorted by urgency — fix live content first
                </p>
                {URGENCY_ORDER.map((key) => {
                  const items = grouped[key]
                  if (items.length === 0) return null
                  const meta = URGENCY_META[key]
                  return (
                    <div key={key}>
                      <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: meta.dotColor }}
                        />
                        {meta.label} ({items.length})
                      </h3>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.content_item_id}
                            ref={(el) => { cardRefs.current[item.content_item_id] = el }}
                            className="glass-panel rounded-xl p-4 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 min-w-0">
                                {channelIcon[item.channel] ?? <Globe size={13} className="text-muted/70" />}
                                <span className="font-medium text-main text-sm truncate">{item.title}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                                <StatusChip tone={meta.badgeTone} label={meta.label.split(' —')[0]} />
                                <StatusChip
                                  tone={item.match_type === 'confirmed' ? 'confirmed' : 'possible'}
                                  label={item.match_type === 'confirmed' ? 'Confirmed' : 'Possible'}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <span className={`font-mono bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100 ${item.match_type === 'confirmed' ? 'line-through' : ''}`}>
                                {item.stale_text}
                              </span>
                              <span className="text-muted">→</span>
                              <span className="font-mono bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100 font-semibold">
                                {item.suggested_replacement || item.new_value}
                              </span>
                              {item.published_url && (
                                <a
                                  href={item.published_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-auto text-accent inline-flex items-center gap-1 hover:underline"
                                  aria-label={`Open published URL for ${item.title}`}
                                >
                                  <ExternalLink size={11} /> Open
                                </a>
                              )}
                            </div>
                            {item.match_method === 'embedding' && (
                              <p className="text-xs text-amber-700">Experimental semantic candidate · model {item.embedding_model} · similarity {item.similarity?.toFixed(2)}. Similarity does not prove the passage is stale; review before editing.</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <strong>Action required:</strong> Update live or scheduled items before publishing.
                  Items marked "Possible" need human confirmation. No changes are applied automatically.
                </div>
              </div>

              {/* ── Ripple diagram ── */}
              <div className="glass-panel rounded-xl p-4 self-start">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                  Impact ripple
                </h3>
                <RippleDiagram result={result} onDotClick={scrollToCard} />
                <div className="mt-3 space-y-1">
                  {URGENCY_ORDER.map((key) => (
                    <div key={key} className="flex items-center gap-2 text-xs text-muted">
                      <span
                        className="w-2.5 h-2.5 rounded-full border-2 flex-shrink-0"
                        style={{ borderColor: URGENCY_META[key].dotColor, backgroundColor: URGENCY_META[key].dotColor }}
                      />
                      {URGENCY_META[key].label.split(' —')[0]} ({grouped[key].length})
                    </div>
                  ))}
                  <div className="flex items-center gap-4 text-xs text-muted pt-1 border-t border-subtle mt-2">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-500 flex-shrink-0" /> Confirmed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-500 flex-shrink-0" /> Possible
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !running && !factsLoading && !error && facts.length > 0 && (
        <div className="text-center py-16 text-muted">
          <div className="w-16 h-16 rounded-full bg-accent-subtle flex items-center justify-center mx-auto mb-4">
            <Crosshair size={28} className="text-accent" />
          </div>
          <p className="text-lg font-medium text-main">Select a fact and run the scan</p>
          <p className="text-sm mt-1">
            Try <strong>customer_count</strong> — approve v2 (65,000+) in the Repository first, then run the scan.
          </p>
        </div>
      )}
    </div>
  )
}
