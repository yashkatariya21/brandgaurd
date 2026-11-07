import React, { useEffect, useRef, useState } from 'react'
import { Plus, X, Play, Crosshair, CheckCircle2, FileText, Upload } from 'lucide-react'
import { contentApi, redTeamApi, ContentItem, ContentDetail, RedTeamResult } from '../api'
import { useTheme } from '../theme'
import StatusBadge from '../components/StatusBadge'
import SeverityBadge from '../components/SeverityBadge'
import AIDisclaimerFooter from '../components/AIDisclaimerFooter'

function ContentDetailModal({ item, onClose, onAnalysed }: {
  item: ContentItem
  onClose: () => void
  onAnalysed: () => void
}) {
  const { isAuthority } = useTheme()
  const [detail, setDetail] = useState<ContentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysing, setAnalysing] = useState(false)
  const [redTeaming, setRedTeaming] = useState(false)
  const [redTeamResult, setRedTeamResult] = useState<RedTeamResult | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    contentApi.get(item.id).then(setDetail).finally(() => setLoading(false))
  }
  useEffect(load, [item.id])

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
              disabled={analysing}
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
              disabled={redTeaming}
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
            <button onClick={onClose} className="text-muted hover:text-main p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto scrollbar-thin p-6 space-y-5 flex-1">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          {loading ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : detail ? (
            <>
              <div>
                <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Content</h4>
                <div className="bg-canvas-secondary rounded-lg p-4 text-sm text-main whitespace-pre-wrap max-h-36 overflow-y-auto scrollbar-thin">
                  {detail.body_text}
                </div>
              </div>

              {detail.claims.length > 0 && (
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
                          <span className="text-xs text-muted">
                            = {c.value_number} {c.value_unit}
                          </span>
                        )}
                        <span
                          className={`ml-auto text-xs ${
                            c.link_status === 'auto' ? 'text-green-600' : 'text-muted'
                          }`}
                        >
                          {c.link_status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.findings.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">
                    Deterministic Findings ({detail.findings.length})
                  </h4>
                  <div className="space-y-2">
                    {detail.findings.map((f) => (
                      <div
                        key={f.id}
                        className="border border-amber-200 bg-amber-50 rounded-lg p-3"
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

              {detail.findings.length === 0 && detail.claims.length > 0 && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-medium">
                    No deterministic findings — content looks clean!
                  </span>
                </div>
              )}
            </>
          ) : null}

          {/* Red Team Results */}
          {redTeamResult && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide">
                  Red Team Results ({redTeamResult.findings.length} findings)
                </h4>
                {redTeamResult.mode === 'demo' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Demo mode (no AI key)
                  </span>
                )}
              </div>
              {redTeamResult.demo_note && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                  {redTeamResult.demo_note}
                </p>
              )}
              <div className="space-y-2">
                {redTeamResult.findings.map((f) => (
                  <div key={f.id} className="border border-rose-200 bg-rose-50 rounded-lg p-3">
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
                        {f.suggested_text && (
                          <p className="text-xs text-green-700 mt-1.5">
                            Suggested: {f.suggested_text}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {redTeamResult.findings.length === 0 && (
                  <div className="text-center py-4 text-muted text-sm">
                    No red team findings generated.
                  </div>
                )}
              </div>
              <p className="text-xs text-muted mt-2">
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
    contentApi.list().then(setItems).finally(() => setLoading(false))
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

  const upload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file || !uploadTitle.trim()) {
      setError('Please enter a title and select a file')
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', uploadTitle)
    fd.append('channel', 'pdf')
    setSubmitting(true)
    setError('')
    try {
      await contentApi.upload(fd)
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

      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      {showForm && (
        <div className="glass-panel rounded-xl p-6">
          <h3 className="text-sm font-semibold text-main mb-4 flex items-center gap-2">
            <FileText size={15} /> Submit New Content
          </h3>

          <form onSubmit={submit} className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                required
                className={inputCls}
              />
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
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
              <Upload size={13} /> Or upload DOCX / PDF
            </p>
            <div className="flex gap-3 items-end flex-wrap">
              <input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Document title"
                className={`flex-1 min-w-[200px] ${inputCls}`}
              />
              <input ref={fileRef} type="file" accept=".docx,.pdf" className="text-sm text-muted" />
              <button
                onClick={upload}
                disabled={submitting}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-lg font-medium">No content items yet.</p>
          <p className="text-sm mt-1">Submit your first piece of content above.</p>
        </div>
      ) : (
        <div className="rounded-xl glass-panel overflow-hidden">
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
      )}

      {selected && (
        <ContentDetailModal item={selected} onClose={() => setSelected(null)} onAnalysed={load} />
      )}
    </div>
  )
}
