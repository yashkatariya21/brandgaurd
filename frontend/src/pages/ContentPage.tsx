import React, { useEffect, useRef, useState } from 'react'
import { contentApi, redTeamApi, ContentItem, ContentDetail, RedTeamResult } from '../api'
import StatusBadge from '../components/StatusBadge'
import SeverityBadge from '../components/SeverityBadge'

function ContentDetailModal({ item, onClose, onAnalysed }: {
  item: ContentItem; onClose: () => void; onAnalysed: () => void
}) {
  const [detail, setDetail] = useState<ContentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailError, setDetailError] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [redTeaming, setRedTeaming] = useState(false)
  const [redTeamResult, setRedTeamResult] = useState<RedTeamResult | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setDetailError('')
    contentApi.get(item.id)
      .then(setDetail)
      .catch((e: unknown) => setDetailError(e instanceof Error ? e.message : 'Could not load content details'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [item.id])

  const analyse = async () => {
    setAnalysing(true); setError('')
    try { await contentApi.analyse(item.id); await load(); onAnalysed() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Analysis failed') }
    finally { setAnalysing(false) }
  }

  const runRedTeam = async () => {
    setRedTeaming(true); setError(''); setRedTeamResult(null)
    try {
      const r = await redTeamApi.run(item.id)
      setRedTeamResult(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Red team failed')
    } finally { setRedTeaming(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-label="Content details and analysis" className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 capitalize">{item.channel}</span>
              <StatusBadge status={item.status} />
              {item.registered_state !== 'none' && <StatusBadge status={item.registered_state} />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={analyse} disabled={analysing}
              className="text-sm px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
              {analysing ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Analysing…</> : 'Run Analysis'}
            </button>
            <button onClick={runRedTeam} disabled={redTeaming}
              className="text-sm px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2">
              {redTeaming ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Running…</> : '🎯 Run Red Team'}
            </button>
            <button onClick={onClose} aria-label="Close content details" className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : detailError ? (
            <p className="text-red-700 text-sm" role="alert">{detailError}</p>
          ) : detail ? (
            <>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Content</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {detail.body_text}
                </div>
              </div>

              {detail.claims.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Extracted Claims ({detail.claims.length})</h4>
                  <div className="space-y-1.5">
                    {detail.claims.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2">
                        <span className="text-xs font-mono bg-white border border-blue-200 px-2 py-0.5 rounded text-blue-700">{c.raw_text}</span>
                        {c.value_number !== null && <span className="text-xs text-gray-400">= {c.value_number} {c.value_unit}</span>}
                        <span className={`ml-auto text-xs ${c.link_status === 'auto' ? 'text-green-600' : 'text-gray-400'}`}>{c.link_status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.findings.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Deterministic Findings ({detail.findings.length})</h4>
                  <div className="space-y-2">
                    {detail.findings.map((f) => (
                      <div key={f.id} className="border border-orange-200 bg-orange-50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <SeverityBadge severity={f.severity} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800">{f.issue}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${f.finding_type === 'confirmed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
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
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                  </svg>
                  <span className="text-sm font-medium">No deterministic findings — content looks clean!</span>
                </div>
              )}
            </>
          ) : null}

          {/* Red Team Results */}
          {redTeamResult && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Red Team Results ({redTeamResult.findings.length} findings)</h4>
                {redTeamResult.mode === 'demo' && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Fallback mode
                  </span>
                )}
              </div>
              {redTeamResult.demo_note && (
                <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3" role="note">{redTeamResult.demo_note}</p>
              )}
              <div className="space-y-2">
                {redTeamResult.findings.map((f) => (
                  <div key={f.id} className="border border-rose-200 bg-rose-50 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <SeverityBadge severity={f.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{f.issue}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                            Possible · {f.persona}
                          </span>
                          <span className="text-xs text-gray-500">confidence: {f.confidence}</span>
                          {f.why_it_matters && f.persona === 'Legal Eagle' && (
                            <span className="text-xs text-slate-500 italic">{f.why_it_matters}</span>
                          )}
                        </div>
                        {f.suggested_text && (
                          <p className="text-xs text-green-700 mt-1.5">Suggested: {f.suggested_text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {redTeamResult.findings.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">No red team findings generated.</div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Red team findings are saved in the Findings page. Go to Findings → Decide to review each one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
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
    setPageError('')
    contentApi.list()
      .then(setItems)
      .catch((e: unknown) => setPageError(e instanceof Error ? e.message : 'Could not load content'))
      .finally(() => setLoading(false))
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
    web: '🌐', social: '📱', email: '✉️', press: '📰', pdf: '📄', image: '🖼️',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content</h1>
          <p className="text-gray-500 mt-1">Submit and analyse brand content</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Content
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm" role="alert">{error}</div>
      )}
      {pageError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm" role="alert">Could not load content: {pageError}</div>}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Submit New Content</h3>

          {/* Text submit */}
          <form onSubmit={submit} className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                required
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {['web', 'social', 'email', 'press', 'pdf', 'image'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Paste content text here…"
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Submit
            </button>
          </form>

          {/* File upload */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">Or upload DOCX / PDF</p>
            <div className="flex gap-3 items-end">
              <input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Document title"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input ref={fileRef} type="file" accept=".docx,.pdf" className="text-sm text-gray-600" />
              <button
                onClick={upload}
                disabled={submitting}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : pageError ? null : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No content items yet.</p>
          <p className="text-sm mt-1">Submit your first piece of content above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Channel</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">State</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((ci) => (
                <tr
                  key={ci.id}
                  className="hover:bg-indigo-50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <button type="button" onClick={() => setSelected(ci)} className="text-left text-indigo-700 hover:underline underline-offset-2">
                      {ci.title}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {channelIcons[ci.channel]} {ci.channel}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={ci.status} /></td>
                  <td className="px-4 py-3">
                    {ci.registered_state !== 'none' && <StatusBadge status={ci.registered_state} />}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(ci.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ContentDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onAnalysed={load}
        />
      )}
    </div>
  )
}
