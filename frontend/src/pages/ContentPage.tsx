import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, X, Play, Crosshair, CheckCircle2, FileText, Upload, BookOpen, ChevronDown } from 'lucide-react'
import { contentApi, redTeamApi, ContentItem, ContentDetail, RedTeamResult } from '../api'
import { useTheme } from '../theme'
import StatusBadge from '../components/StatusBadge'
import SeverityBadge from '../components/SeverityBadge'
import AIDisclaimerFooter from '../components/AIDisclaimerFooter'
import HighlightedText, { SeverityLegend } from '../components/HighlightedText'
import { type AnnotatedRange } from '../lib/segments'
import { IS_DEMO_MODE } from '../lib/demoAccounts'
import { DEMO_SAMPLES } from '../lib/demoSamples'

function ContentDetailModal({ item, onClose, onAnalysed }: {
  item: ContentItem
  onClose: () => void
  onAnalysed: () => void
}) {
  const [detail, setDetail] = useState<ContentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysing, setAnalysing] = useState(false)
  const [redTeaming, setRedTeaming] = useState(false)
  const [redTeamResult, setRedTeamResult] = useState<RedTeamResult | null>(null)
  const [error, setError] = useState('')
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null)
  const [showClaims, setShowClaims] = useState(false)
  const findingRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try { setDetail(await contentApi.get(item.id)) }
    finally { setLoading(false) }
  }, [item.id])

  useEffect(() => {
    void load().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load content.'))
  }, [load])

  const analyse = async () => {
    setAnalysing(true)
    setError('')
    try {
      await contentApi.analyse(item.id)
      await load()
      onAnalysed()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalysing(false)
    }
  }

  const runRedTeam = async () => {
    setRedTeaming(true)
    setError('')
    setRedTeamResult(null)
    try {
      const r = await redTeamApi.run(item.id)
      setRedTeamResult(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Red team failed')
    } finally {
      setRedTeaming(false)
    }
  }

  const handleSelectHighlight = useCallback((id: string | null) => {
    setSelectedFindingId(id)
    if (id && findingRefs.current[id]) {
      findingRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [])

  // Build annotation ranges from findings (only those with valid spans)
  const textLen = detail?.body_text.length ?? 0
  const findingRanges: AnnotatedRange[] = (detail?.findings ?? [])
    .filter((f) => f.span_start != null && f.span_end != null && f.span_start < f.span_end && f.span_end <= textLen)
    .map((f) => ({
      id: f.id,
      start: f.span_start as number,
      end: f.span_end as number,
      severity: f.severity,
      label: f.issue,
      kind: 'finding' as const,
    }))

  const claimRanges: AnnotatedRange[] = (detail?.claims ?? [])
    .filter((c) => c.span_start >= 0 && c.span_end > c.span_start && c.span_end <= textLen)
    .map((c) => ({
      id: c.id,
      start: c.span_start,
      end: c.span_end,
      severity: 'low',
      label: c.raw_text,
      kind: 'claim' as const,
    }))

  const activeRanges = showClaims ? [...findingRanges, ...claimRanges] : findingRanges

  const locatedFindings = (detail?.findings ?? []).filter(
    (f) => f.span_start != null && f.span_end != null && f.span_start < f.span_end,
  )
  const unlocatedFindings = (detail?.findings ?? []).filter(
    (f) => f.span_start == null || f.span_end == null || f.span_start >= f.span_end,
  )

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-subtle">
          <div>
            <h3 className="text-lg font-bold text-main font-newsreader">{item.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted capitalize">{item.channel}</span>
              <StatusBadge status={item.status} />
              {item.registered_state !== 'none' && <StatusBadge status={item.registered_state} />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={analyse}
              disabled={analysing || loading || !detail}
              className="text-sm px-3 py-2 bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {analysing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analysing…
                </>
              ) : (
                <>
                  <Play size={14} /> Run Analysis
                </>
              )}
            </button>
            <button
              onClick={runRedTeam}
              disabled={redTeaming || loading || !detail}
              className="text-sm px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
            >
              {redTeaming ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <Crosshair size={14} /> Run Red Team
                </>
              )}
            </button>
            <button onClick={onClose} className="text-muted hover:text-main p-1" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto scrollbar-thin p-6 space-y-5 flex-1">
          {error && <div role="alert" className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}{!detail && <button className="ml-2 underline" onClick={() => { setError(''); void load().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load content.')) }}>Retry</button>}</div>}

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-6 bg-canvas-secondary rounded animate-pulse" />
              ))}
            </div>
          ) : detail ? (
            <>
              {/* ── Highlighted body text ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide">Content</h4>
                  <div className="flex items-center gap-3">
                    <SeverityLegend />
                    {detail.claims.length > 0 && (
                      <button
                        onClick={() => setShowClaims((v) => !v)}
                        className="flex items-center gap-1 text-xs text-accent hover:opacity-80"
                      >
                        {showClaims ? 'Hide' : 'Show'} claims
                        <ChevronDown
                          size={12}
                          className={`transition-transform ${showClaims ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-canvas-secondary rounded-lg p-4 overflow-y-auto scrollbar-thin max-h-56">
                  <HighlightedText
                    text={detail.body_text}
                    ranges={activeRanges}
                    selectedId={selectedFindingId}
                    onSelect={handleSelectHighlight}
                  />
                </div>
              </div>

              {/* ── Located findings ── */}
              {locatedFindings.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">
                    Located findings ({locatedFindings.length})
                  </h4>
                  <div className="space-y-2">
                    {locatedFindings.map((f) => (
                      <div
                        key={f.id}
                        ref={(el) => { findingRefs.current[f.id] = el }}
                        onClick={() => handleSelectHighlight(selectedFindingId === f.id ? null : f.id)}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          selectedFindingId === f.id
                            ? 'border-accent bg-accent-subtle ring-1 ring-accent/30'
                            : 'border-amber-200 bg-amber-50 hover:border-accent/40'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <SeverityBadge severity={f.severity} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-main">{f.issue}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  f.finding_type === 'confirmed'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {f.finding_type}
                              </span>
                              <StatusBadge status={f.status} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Unlocated findings ── */}
              {unlocatedFindings.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">
                    Not located in the text ({unlocatedFindings.length})
                  </h4>
                  <div className="space-y-2">
                    {unlocatedFindings.map((f) => (
                      <div key={f.id} className="border border-slate-200 bg-slate-50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <SeverityBadge severity={f.severity} />
                          <p className="text-sm text-main">{f.issue}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.findings.length === 0 && detail.claims.length > 0 && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-medium">No deterministic findings — content looks clean!</span>
                </div>
              )}

              {/* ── Extracted claims (collapsible via toggle above) ── */}
              {showClaims && detail.claims.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">
                    Extracted Claims ({detail.claims.length})
                  </h4>
                  <div className="space-y-1.5">
                    {detail.claims.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100"
                      >
                        <span className="text-xs font-mono bg-white border border-blue-200 px-2 py-0.5 rounded text-blue-700">
                          {c.raw_text}
                        </span>
                        {c.value_number !== null && (
                          <span className="text-xs text-muted">= {c.value_number} {c.value_unit}</span>
                        )}
                        <span className={`ml-auto text-xs ${c.link_status === 'auto' ? 'text-green-600' : 'text-muted'}`}>
                          {c.link_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}

          {/* ── Red Team Results (persona cards) ── */}
          {redTeamResult && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide">
                  Red Team ({redTeamResult.findings.length} findings)
                </h4>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  redTeamResult.mode === 'demo'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {redTeamResult.mode === 'demo' ? 'Demo mode · heuristic output, not AI' : 'AI-generated · review required'}
                </span>
              </div>
              {redTeamResult.demo_note && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                  {redTeamResult.demo_note}
                </p>
              )}

              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                Findings remain possible; a person decides. Personas are prompts on the same model, not independent experts. Citation validation checks the source exists, not that the conclusion is correct.
              </p>

              <div className="text-xs text-main bg-canvas-secondary rounded p-3 mb-3 space-y-1">
                <p>Grounding pass rate: {redTeamResult.metrics.grounding_pass_rate == null ? 'not applicable' : `${Math.round(redTeamResult.metrics.grounding_pass_rate * 100)}%`} · Ungrounded drops: {redTeamResult.metrics.ungrounded_drops}</p>
                <p>Stable clusters: {redTeamResult.metrics.stability_rate == null ? 'not applicable' : `${Math.round(redTeamResult.metrics.stability_rate * 100)}%`} · Unstable hidden: {redTeamResult.metrics.unstable_hidden}</p>
                <p>Run time: {redTeamResult.metrics.duration_seconds}s · {redTeamResult.metrics.model}{redTeamResult.cached ? ' · cached' : ''}</p>
              </div>
              {redTeamResult.findings.length === 0 && <p className="text-sm text-muted mb-3">No stable evidence-backed findings. Show {redTeamResult.unstable_findings.length} unstable below.</p>}

              {/* Group by persona */}
              {(() => {
                const personaNames = ['Legal Eagle', 'Brand Police', 'Customer Voice', 'Competitor Watch']
                const personaIcons: Record<string, string> = {
                  'Legal Eagle': '⚖️',
                  'Brand Police': '🛡️',
                  'Customer Voice': '💬',
                  'Competitor Watch': '👁️',
                }
                const grouped = personaNames.map((name) => ({
                  name,
                  icon: personaIcons[name] ?? '👁️',
                  findings: redTeamResult.findings.filter((f) => f.persona === name),
                }))
                return (
                  <div className="space-y-3">
                    {grouped.map(({ name, icon, findings: pf }) => {
                      const worstSev = ['critical', 'high', 'medium', 'low'].find((s) =>
                        pf.some((f) => f.severity === s),
                      )
                      return (
                        <div key={name} className="border border-subtle rounded-xl overflow-hidden">
                          <div className="flex items-center gap-2 px-4 py-3 bg-canvas-secondary/50">
                            <span className="text-base">{icon}</span>
                            <span className="text-sm font-semibold text-main">{name}</span>
                            {pf.length === 0 ? (
                              <span className="ml-auto text-xs text-green-600 font-medium">No stable findings</span>
                            ) : (
                              <>
                                <span className="text-xs text-muted ml-auto">{pf.length} finding{pf.length !== 1 ? 's' : ''}</span>
                                {worstSev && <SeverityBadge severity={worstSev} />}
                              </>
                            )}
                          </div>
                          {pf.length > 0 && (
                            <div className="divide-y divide-subtle">
                              {pf.map((f) => (
                                <div key={f.id} className="px-4 py-3">
                                  <div className="flex items-start gap-2">
                                    <SeverityBadge severity={f.severity} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-main">{f.issue}</p>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                          Possible · {f.persona}
                                        </span>
                                        <span className="text-xs text-muted">confidence: {f.confidence}</span>
                                        {f.why_it_matters && f.persona === 'Legal Eagle' && (
                                          <span className="text-xs text-muted italic">{f.why_it_matters}</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted mt-1">Stable {f.appearances}/{f.total_runs} · repeat agreement does not make a finding confirmed</p>
                                      <ul className="mt-2 space-y-1">{f.citations.map((c, i) => <li key={i} className="text-xs text-main border border-subtle rounded px-2 py-1">{c.kind}{c.version != null ? ` v${c.version}` : ''}: “{c.quote}”</li>)}</ul>
                                      {f.suggested_text && (
                                        <p className="text-xs text-green-700 mt-1.5">Suggested: {f.suggested_text}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              <details className="mt-3 text-sm"><summary className="cursor-pointer text-main">Unstable (hidden by default): {redTeamResult.unstable_findings.length}</summary>
                <ul className="space-y-2 mt-2">{redTeamResult.unstable_findings.map(f => <li key={f.id} className="border border-subtle rounded p-2 text-main"><strong>Possible · {f.persona} · {f.appearances}/{f.total_runs}</strong><p>{f.issue}</p>{f.citations.map((c, i) => <p className="text-xs" key={i}>{c.kind}: “{c.quote}”</p>)}</li>)}</ul>
              </details>
              <p className="text-xs text-muted mt-3">
                Red team findings are saved in the Findings page. Go to Findings → Decide to review each one.
              </p>
            </div>
          )}
        </div>

        <AIDisclaimerFooter />
      </div>
    </div>
  )
}

export default function ContentPage() {
  const { isAuthority } = useTheme()
  const [items, setItems] = useState<ContentItem[]>([])
  const [loadError, setLoadError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadChannel, setUploadChannel] = useState('pdf')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ContentItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [channel, setChannel] = useState('web')
  const [bodyText, setBodyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadTitle, setUploadTitle] = useState('')

  const load = () => {
    setLoading(true)
    setLoadError('')
    contentApi.list().then(setItems).catch((e: unknown) => { setItems([]); setLoadError(e instanceof Error ? e.message : 'Could not load content.') }).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await contentApi.submit({ title, channel, body_text: bodyText })
      setTitle('')
      setBodyText('')
      setShowForm(false)
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  const upload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !uploadTitle.trim()) {
      setError('Please enter a title and select a file')
      return
    }
    if (file.size > 10_000_000) { setError('File must be 10 MB or smaller.'); return }
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) { setError('Choose a PDF, DOCX, or TXT file.'); return }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', uploadTitle.trim())
    fd.append('channel', uploadChannel)
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const result = await contentApi.upload(fd)
      setSuccess(`Document uploaded and ${result.extracted_length.toLocaleString()} characters extracted. Open it below to run analysis.`)
      setUploadTitle('')
      if (fileRef.current) fileRef.current.value = ''
      load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  const channelIcons: Record<string, string> = {
    web: '🌐',
    social: '📱',
    email: '✉️',
    press: '📰',
    pdf: '📄',
    image: '🖼️',
  }

  const inputCls =
    'px-3 py-2 border border-subtle rounded-lg text-sm focus:outline-none focus:border-accent bg-surface text-main'

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto p-6 pb-12">
      {loadError && <div role="alert" className="p-3 rounded bg-amber-100 text-amber-900">Could not load workspace content: {loadError} <button type="button" className="underline font-semibold" onClick={load}>Retry</button></div>}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className={`text-main ${isAuthority ? 'font-newsreader text-3xl' : 'font-jakarta text-2xl font-bold'}`}
          >
            Content Review
          </h1>
          <p className="text-sm text-muted mt-1">Submit and analyse brand content.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 text-sm font-medium"
        >
          <Plus size={15} strokeWidth={2} />
          New Content
        </button>
      </div>

      {error && <div role="alert" className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
      {success && <div role="status" className="p-3 bg-green-50 text-green-800 rounded-lg text-sm">{success}</div>}

      {showForm && (
        <div className="glass-panel rounded-xl p-6">
          <h3 className="text-sm font-semibold text-main mb-4 flex items-center gap-2">
            <FileText size={15} /> Submit New Content
          </h3>

          {/* Demo sample loader — only when VITE_DEMO_MODE=true */}
          {IS_DEMO_MODE && (
            <div className="mb-4 flex items-center gap-2">
              <BookOpen size={14} className="text-accent flex-shrink-0" />
              <label className="text-xs font-medium text-muted">Load sample text:</label>
              <select
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10)
                  if (isNaN(idx)) return
                  const s = DEMO_SAMPLES[idx]
                  setTitle(s.title)
                  setChannel(s.channel)
                  setBodyText(s.body)
                  e.target.value = ''
                }}
                defaultValue=""
                className="flex-1 px-2.5 py-1.5 text-xs border border-subtle rounded-lg bg-surface text-main focus:outline-none focus:border-accent"
              >
                <option value="" disabled>— pick a sample —</option>
                {DEMO_SAMPLES.map((s, i) => (
                  <option key={i} value={i}>{s.title}</option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                required
                aria-label="Content title"
                className={inputCls}
              />
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                aria-label="Channel"
                className={inputCls}
              >
                {['web', 'social', 'email', 'press', 'pdf', 'image'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Paste content text here…"
              required
              rows={4}
              aria-label="Content body text"
              className={`${inputCls} w-full`}
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              Submit
            </button>
          </form>

          <div className="border-t border-subtle pt-4">
            <p className="text-xs font-semibold text-muted mb-3 flex items-center gap-1.5">
              <Upload size={13} /> Or upload a PDF, DOCX or UTF-8 text file (up to 10 MB)
            </p>
            <form onSubmit={upload} className="flex gap-3 items-end flex-wrap">
              <input
                aria-label="Document title"
                maxLength={200}
                required
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Document title"
                className={`flex-1 min-w-[200px] ${inputCls}`}
              />
              <select aria-label="Document channel" value={uploadChannel} onChange={e => setUploadChannel(e.target.value)} className={inputCls}>{['web', 'social', 'email', 'press', 'pdf', 'image'].map(c => <option key={c} value={c}>{c}</option>)}</select>
              <input ref={fileRef} type="file" accept=".docx,.pdf,.txt" required aria-label="Choose document" className="text-sm text-muted" />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? 'Uploading…' : 'Upload'}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : loadError ? null : items.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-lg font-medium">No content items yet.</p>
          <p className="text-sm mt-1">Submit your first piece of content above.</p>
        </div>
      ) : (
        <div className="rounded-xl glass-panel overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-subtle bg-canvas-secondary/50">
                {['Title', 'Channel', 'Status', 'State', 'Created'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[11px] font-semibold text-muted uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((ci) => (
                <tr
                  key={ci.id}
                  onClick={() => setSelected(ci)}
                  className="governance-row cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-main">{ci.title}</td>
                  <td className="px-4 py-3 text-muted">
                    {channelIcons[ci.channel]} {ci.channel}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ci.status} />
                  </td>
                  <td className="px-4 py-3">
                    {ci.registered_state !== 'none' ? (
                      <StatusBadge status={ci.registered_state} />
                    ) : (
                      <span className="text-xs text-muted/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">
                    {new Date(ci.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {selected && (
        <ContentDetailModal item={selected} onClose={() => setSelected(null)} onAnalysed={load} />
      )}
    </div>
  )
}
