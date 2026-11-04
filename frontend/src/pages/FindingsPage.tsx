import React, { useEffect, useState } from 'react'
import { findingsApi, Finding } from '../api'
import SeverityBadge from '../components/SeverityBadge'
import StatusBadge from '../components/StatusBadge'

const REASON_CODES = [
  { value: 'not_applicable', label: 'Not applicable' },
  { value: 'intended_meaning', label: 'Intended meaning' },
  { value: 'rule_unclear', label: 'Rule is unclear' },
  { value: 'evidence_wrong', label: 'Evidence wrong' },
  { value: 'other', label: 'Other' },
]

function DecideModal({ finding, onClose, onDecided }: {
  finding: Finding
  onClose: () => void
  onDecided: () => void
}) {
  const [action, setAction] = useState<string>('')
  const [reasonCode, setReasonCode] = useState('')
  const [reasonText, setReasonText] = useState('')
  const [finalText, setFinalText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!action) return
    if (action === 'dismiss' && !reasonCode) {
      setError('Reason code is required to dismiss')
      return
    }
    setLoading(true)
    setError('')
    try {
      await findingsApi.decide(finding.id, action, reasonCode || undefined, reasonText || undefined, finalText || undefined)
      onDecided()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Decide on Finding</h3>
              <p className="text-sm text-gray-500 mt-1">{finding.issue}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Action</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'accept', label: '✓ Accept', cls: 'border-green-300 bg-green-50 text-green-700' },
                { value: 'edit', label: '✏️ Edit', cls: 'border-blue-300 bg-blue-50 text-blue-700' },
                { value: 'dismiss', label: '✗ Dismiss', cls: 'border-gray-300 bg-gray-50 text-gray-700' },
                { value: 'escalate', label: '↑ Escalate', cls: 'border-purple-300 bg-purple-50 text-purple-700' },
              ].map((a) => (
                <button
                  key={a.value}
                  onClick={() => setAction(a.value)}
                  className={`px-3 py-2 border-2 rounded-lg text-sm font-medium transition-all ${
                    action === a.value ? a.cls + ' ring-2 ring-offset-1' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {action === 'dismiss' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— select reason —</option>
                {REASON_CODES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          {action === 'edit' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Suggested text</label>
              <textarea
                value={finalText}
                onChange={(e) => setFinalText(e.target.value)}
                placeholder="Enter the corrected text…"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Add any notes…"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={loading || !action}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save Decision'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Finding | null>(null)
  const [filter, setFilter] = useState<string>('open')

  const load = () => {
    setLoading(true)
    findingsApi.list().then(setFindings).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = filter === 'all'
    ? findings
    : findings.filter((f) => f.status === filter)

  const counts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] ?? 0) + 1
    return acc
  }, {})

  const filterOptions = [
    { value: 'all', label: `All (${findings.length})` },
    { value: 'open', label: `Open (${counts.open ?? 0})` },
    { value: 'accepted', label: `Accepted (${counts.accepted ?? 0})` },
    { value: 'dismissed', label: `Dismissed (${counts.dismissed ?? 0})` },
    { value: 'escalated', label: `Escalated (${counts.escalated ?? 0})` },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Findings</h1>
        <p className="text-gray-500 mt-1">Review and decide on brand compliance findings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Open', count: counts.open ?? 0, cls: 'border-orange-200 bg-orange-50', tcls: 'text-orange-700' },
          { label: 'Critical', count: findings.filter((f) => f.severity === 'critical' && f.status === 'open').length, cls: 'border-red-200 bg-red-50', tcls: 'text-red-700' },
          { label: 'Accepted', count: counts.accepted ?? 0, cls: 'border-green-200 bg-green-50', tcls: 'text-green-700' },
          { label: 'Total', count: findings.length, cls: 'border-gray-200 bg-gray-50', tcls: 'text-gray-700' },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-4 ${s.cls}`}>
            <p className={`text-2xl font-bold ${s.tcls}`}>{s.count}</p>
            <p className="text-sm text-gray-600">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {filterOptions.map((fo) => (
          <button
            key={fo.value}
            onClick={() => setFilter(fo.value)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === fo.value
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {fo.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No {filter !== 'all' ? filter : ''} findings</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => (
            <div
              key={f.id}
              className={`bg-white border rounded-xl p-4 cursor-pointer hover:border-indigo-300 transition-colors ${
                f.severity === 'critical' ? 'border-red-300' : 'border-gray-200'
              }`}
              onClick={() => setSelected(f)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">
                  <SeverityBadge severity={f.severity} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-snug">{f.issue}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-gray-500">{f.content_title}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500 capitalize">{f.source_kind}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-400">
                      {new Date(f.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={f.status} />
                  {f.status === 'open' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(f) }}
                      className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Decide
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <DecideModal finding={selected} onClose={() => setSelected(null)} onDecided={load} />
      )}
    </div>
  )
}
