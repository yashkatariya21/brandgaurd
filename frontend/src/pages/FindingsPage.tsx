import React, { useEffect, useState } from 'react'
import { X, Scale, Shield, Gavel, Pencil, XCircle, ArrowUp } from 'lucide-react'
import { findingsApi, debateApi, Finding, Debate } from '../api'
import { useTheme } from '../theme'
import SeverityBadge from '../components/SeverityBadge'
import StatusBadge from '../components/StatusBadge'
import AIDisclaimerFooter from '../components/AIDisclaimerFooter'

const REASON_CODES = [
  { value: 'not_applicable', label: 'Not applicable' },
  { value: 'intended_meaning', label: 'Intended meaning' },
  { value: 'rule_unclear', label: 'Rule is unclear' },
  { value: 'evidence_wrong', label: 'Evidence wrong' },
  { value: 'other', label: 'Other' },
]

// ── Debate Panel ──────────────────────────────────────────────────────────────

function DebatePanel({ finding, onClose }: { finding: Finding; onClose: () => void }) {
  const [debate, setDebate] = useState<Debate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    debateApi
      .get(finding.id)
      .then(setDebate)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [finding.id])

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-subtle">
          <div>
            <h3 className="text-lg font-bold text-main font-newsreader">Prosecutor vs Defender</h3>
            <p className="text-sm text-muted mt-0.5 max-w-lg">{finding.issue}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {debate?.mode === 'demo' && (
              <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                Demo mode (no AI key)
              </span>
            )}
            <button onClick={onClose} className="text-muted hover:text-main p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto scrollbar-thin flex-1 p-6">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4">{error}</div>}

          {loading ? (
            <div className="flex items-center gap-3 text-muted">
              <span className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              Generating debate arguments…
            </div>
          ) : debate ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {/* Prosecutor */}
                <div className="border-2 border-red-200 rounded-xl p-4 bg-red-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Scale size={18} className="text-red-700" />
                    <h4 className="font-bold text-red-700 text-sm uppercase tracking-wide">
                      Prosecutor
                    </h4>
                    <span className="ml-auto text-xs text-red-500 font-medium">The case FOR fixing</span>
                  </div>
                  <p className="text-sm text-main leading-relaxed">{debate.prosecutor_text}</p>
                </div>
                {/* Defender */}
                <div className="border-2 border-green-200 rounded-xl p-4 bg-green-50">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={18} className="text-green-700" />
                    <h4 className="font-bold text-green-700 text-sm uppercase tracking-wide">
                      Defender
                    </h4>
                    <span className="ml-auto text-xs text-green-600 font-medium">The case AGAINST</span>
                  </div>
                  <p className="text-sm text-main leading-relaxed">{debate.defender_text}</p>
                </div>
              </div>

              {debate.minimal_edit && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                    Suggested minimal edit
                  </p>
                  <p className="text-sm text-main">{debate.minimal_edit}</p>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-subtle rounded-lg text-center">
                <p className="text-xs text-muted italic">{debate.footer}</p>
              </div>
            </>
          ) : null}
        </div>

        <AIDisclaimerFooter />
      </div>
    </div>
  )
}

// ── Decide Modal ──────────────────────────────────────────────────────────────

function DecideModal({ finding, onClose, onDecided }: {
  finding: Finding
  onClose: () => void
  onDecided: () => void
}) {
  const [action, setAction] = useState('')
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
      await findingsApi.decide(
        finding.id,
        action,
        reasonCode || undefined,
        reasonText || undefined,
        finalText || undefined,
      )
      onDecided()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  const actionOpts = [
    { value: 'accept', label: 'Accept', Icon: Shield, cls: 'border-green-300 bg-green-50 text-green-700' },
    { value: 'edit', label: 'Edit', Icon: Pencil, cls: 'border-blue-300 bg-blue-50 text-blue-700' },
    { value: 'dismiss', label: 'Dismiss', Icon: XCircle, cls: 'border-gray-300 bg-gray-50 text-gray-700' },
    { value: 'escalate', label: 'Escalate', Icon: ArrowUp, cls: 'border-purple-300 bg-purple-50 text-purple-700' },
  ]

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-subtle">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-main font-newsreader">Decide on Finding</h3>
              <p className="text-sm text-muted mt-1">{finding.issue}</p>
            </div>
            <button onClick={onClose} className="text-muted hover:text-main flex-shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-muted mb-2">Action</label>
            <div className="grid grid-cols-2 gap-2">
              {actionOpts.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setAction(a.value)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 border-2 rounded-lg text-sm font-medium transition-all ${
                    action === a.value
                      ? `${a.cls} ring-2 ring-offset-1`
                      : 'border-subtle text-muted hover:border-accent/40'
                  }`}
                >
                  <a.Icon size={15} />
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          {action === 'dismiss' && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full px-3 py-2 border border-subtle rounded-lg text-sm focus:outline-none focus:border-accent bg-surface text-main"
              >
                <option value="">— select reason —</option>
                {REASON_CODES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {action === 'edit' && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Suggested text</label>
              <textarea
                value={finalText}
                onChange={(e) => setFinalText(e.target.value)}
                placeholder="Enter the corrected text…"
                rows={2}
                className="w-full px-3 py-2 border border-subtle rounded-lg text-sm focus:outline-none focus:border-accent bg-surface text-main"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Notes (optional)</label>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Add any notes…"
              rows={2}
              className="w-full px-3 py-2 border border-subtle rounded-lg text-sm focus:outline-none focus:border-accent bg-surface text-main"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-main">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={loading || !action}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Gavel size={14} />
              {loading ? 'Saving…' : 'Save Decision'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Findings Page ────────────────────────────────────────────────────────

export default function FindingsPage() {
  const { isAuthority } = useTheme()
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Finding | null>(null)
  const [debating, setDebating] = useState<Finding | null>(null)
  const [filter, setFilter] = useState('open')

  const load = () => {
    setLoading(true)
    findingsApi.list().then(setFindings).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = filter === 'all' ? findings : findings.filter((f) => f.status === filter)
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

  const statCards = [
    { label: 'Open', count: counts.open ?? 0, cls: 'border-amber-200 bg-amber-50', tcls: 'text-amber-700' },
    {
      label: 'Critical',
      count: findings.filter((f) => f.severity === 'critical' && f.status === 'open').length,
      cls: 'border-red-200 bg-red-50',
      tcls: 'text-red-700',
    },
    { label: 'Accepted', count: counts.accepted ?? 0, cls: 'border-green-200 bg-green-50', tcls: 'text-green-700' },
    { label: 'Total', count: findings.length, cls: 'border-subtle bg-canvas-secondary', tcls: 'text-main' },
  ]

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto p-6 pb-12">
      <div className="mb-2">
        <h1
          className={`text-main ${isAuthority ? 'font-newsreader text-3xl' : 'font-jakarta text-2xl font-bold'}`}
        >
          Findings & Decisions
        </h1>
        <p className="text-sm text-muted mt-1">
          Review brand compliance findings. Use "Show debate" to see both sides before deciding.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={`border rounded-xl p-4 ${s.cls}`}>
            <p className={`text-2xl font-bold font-mono-numbers ${s.tcls}`}>{s.count}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-canvas-secondary p-1 rounded-lg w-fit">
        {filterOptions.map((fo) => (
          <button
            key={fo.value}
            onClick={() => setFilter(fo.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === fo.value ? 'bg-surface text-accent shadow-sm' : 'text-muted hover:text-main'
            }`}
          >
            {fo.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <p className="text-lg font-medium text-main">No {filter !== 'all' ? filter : ''} findings</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => (
            <div
              key={f.id}
              className={`glass-panel rounded-xl p-4 hover:border-accent/40 transition-colors ${
                f.severity === 'critical' && f.status === 'open' ? 'border-red-300' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 pt-0.5">
                  <SeverityBadge severity={f.severity} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-main leading-snug">{f.issue}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted">{f.content_title}</span>
                    <span className="text-xs text-muted/40">·</span>
                    {f.source_kind === 'persona' ? (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                        Possible · {f.persona ?? 'Persona'}
                      </span>
                    ) : (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          f.finding_type === 'confirmed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {f.finding_type === 'confirmed' ? 'Confirmed' : 'Possible'} · {f.source_kind}
                      </span>
                    )}
                    <span className="text-xs text-muted/40">·</span>
                    <span className="text-xs text-muted/60">
                      {new Date(f.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={f.status} />
                  {f.status === 'open' && (
                    <>
                      <button
                        onClick={() => setDebating(f)}
                        className="text-xs px-2 py-1 border border-subtle text-muted rounded hover:bg-accent-subtle"
                      >
                        Show debate
                      </button>
                      <button
                        onClick={() => setSelected(f)}
                        className="text-xs px-2 py-1 bg-accent text-white rounded hover:opacity-90"
                      >
                        Decide
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <DecideModal finding={selected} onClose={() => setSelected(null)} onDecided={load} />}
      {debating && <DebatePanel finding={debating} onClose={() => setDebating(null)} />}
    </div>
  )
}
