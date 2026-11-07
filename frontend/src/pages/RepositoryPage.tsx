import React, { useEffect, useState } from 'react'
import { Plus, X, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { factsApi, rulesApi, Fact, FactDetail, Rule } from '../api'
import { useAuth } from '../auth'
import { useTheme } from '../theme'
import StatusBadge from '../components/StatusBadge'
import ExpiryChip from '../components/ExpiryChip'

type Tab = 'facts' | 'rules'

// ── Version timeline ────────────────────────────────────────────────────────

function VersionTimeline({ versions, factId, onAction, userRole }: {
  versions: FactDetail['versions']
  factId: string
  onAction: () => void
  userRole: string
}) {
  const canApprove = ['admin', 'approver'].includes(userRole)
  const canPropose = ['admin', 'brand_manager'].includes(userRole)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [expandedDiff, setExpandedDiff] = useState<number | null>(null)
  const [diffData, setDiffData] = useState<Record<number, Record<string, { before: unknown; after: unknown }>>>({})

  const doAction = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try { await fn(); onAction() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Action failed') }
    finally { setBusy(false) }
  }

  const loadDiff = async (versionNo: number) => {
    if (versionNo <= 1) return
    if (diffData[versionNo]) {
      setExpandedDiff(expandedDiff === versionNo ? null : versionNo)
      return
    }
    try {
      const res = await factsApi.diff(factId, versionNo)
      setDiffData((d) => ({ ...d, [versionNo]: res.diff }))
      setExpandedDiff(versionNo)
    } catch {
      // diff not available — silently ignore
    }
  }

  const sorted = [...versions].sort((a, b) => b.version_no - a.version_no)

  return (
    <div className="mt-5">
      <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-3">
        Version history
      </h4>
      {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-subtle" />

        <div className="space-y-4">
          {sorted.map((v, idx) => {
            const isFirst = idx === sorted.length - 1
            const hasDiff = v.version_no > 1
            const diff = diffData[v.version_no]
            const isExpanded = expandedDiff === v.version_no

            return (
              <div key={v.id} className="flex gap-3">
                {/* Timeline dot */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 bg-surface"
                  style={{ borderColor: v.status === 'approved' ? '#15803d' : v.status === 'rejected' ? '#dc2626' : 'var(--border-subtle)' }}
                >
                  <span className="text-[10px] font-bold text-muted">v{v.version_no}</span>
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <StatusBadge status={v.status} />
                        <span className="text-xs text-muted">
                          {new Date(v.created_at).toLocaleDateString()}
                        </span>
                        {isFirst && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                            Initial version
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-main">{v.value_text}</p>
                      {v.change_note && <p className="text-xs text-muted mt-0.5">{v.change_note}</p>}
                      {v.proposed_by && (
                        <p className="text-[11px] text-muted/70 mt-0.5">
                          Proposed by {v.proposed_by}
                          {v.approved_by && ` · Approved by ${v.approved_by}`}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                      {hasDiff && (
                        <button
                          onClick={() => loadDiff(v.version_no)}
                          className="text-xs px-2 py-1 border border-subtle text-muted rounded hover:bg-accent-subtle flex items-center gap-1"
                        >
                          View changes
                          {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </button>
                      )}
                      {v.status === 'draft' && canPropose && (
                        <button
                          disabled={busy}
                          onClick={() => doAction(() => factsApi.approveVersion(factId, v.version_no))}
                          className="text-xs px-2.5 py-1 bg-accent text-white rounded-md hover:opacity-90 disabled:opacity-50"
                        >
                          Submit for approval
                        </button>
                      )}
                      {v.status === 'pending_approval' && canApprove && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => doAction(() => factsApi.approveVersion(factId, v.version_no))}
                            className="text-xs px-2.5 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => doAction(() => factsApi.rejectVersion(factId, v.version_no))}
                            className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Diff view */}
                  {isExpanded && diff && (
                    <div className="mt-2 rounded-lg border border-subtle bg-canvas-secondary p-3 space-y-2">
                      {Object.entries(diff).map(([field, { before, after }]) => (
                        <div key={field} className="text-xs">
                          <span className="text-muted font-medium capitalize">{field.replace(/_/g, ' ')}: </span>
                          <span className="line-through text-red-600 bg-red-50 px-1 rounded">
                            {String(before ?? '—')}
                          </span>
                          <span className="mx-1 text-muted">→</span>
                          <span className="text-green-700 bg-green-50 px-1 rounded font-medium">
                            {String(after ?? '—')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Fact detail modal ────────────────────────────────────────────────────────

function FactModal({ fact: initial, onClose, userRole }: {
  fact: Fact
  onClose: () => void
  userRole: string
}) {
  const [detail, setDetail] = useState<FactDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPropose, setShowPropose] = useState(false)
  const [proposeValue, setProposeValue] = useState('')
  const [proposeNote, setProposeNote] = useState('')
  const [proposing, setProposing] = useState(false)
  const canPropose = ['admin', 'brand_manager'].includes(userRole)

  const load = () => {
    setLoading(true)
    factsApi.get(initial.id).then(setDetail).finally(() => setLoading(false))
  }

  useEffect(load, [initial.id])

  const propose = async (e: React.FormEvent) => {
    e.preventDefault()
    setProposing(true)
    try {
      await factsApi.proposeVersion(initial.id, {
        value_text: proposeValue,
        change_note: proposeNote,
      })
      setProposeValue('')
      setProposeNote('')
      setShowPropose(false)
      load()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to propose')
    } finally {
      setProposing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
          <div>
            <h3 className="font-bold text-main font-newsreader text-lg">{initial.label}</h3>
            <p className="text-xs text-muted font-mono mt-0.5">
              {initial.key} · {initial.category}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-main p-1 rounded-lg hover:bg-accent-subtle">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto scrollbar-thin px-6 py-5">
          {loading ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : detail ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-canvas-secondary rounded-lg p-3">
                  <p className="text-xs text-muted mb-1">Current value</p>
                  <p className="text-sm font-semibold text-main">{detail.value_text}</p>
                </div>
                <div className="bg-canvas-secondary rounded-lg p-3">
                  <p className="text-xs text-muted mb-1">Status</p>
                  <StatusBadge status={detail.version_status ?? 'draft'} />
                </div>
                {detail.expires_at && (
                  <div className="bg-canvas-secondary rounded-lg p-3 col-span-2 border border-subtle">
                    <p className="text-xs text-muted mb-1">Expiry</p>
                    <ExpiryChip expiresAt={detail.expires_at} />
                  </div>
                )}
              </div>

              {detail.aliases.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs text-muted mb-2">Aliases & banned forms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.aliases.map((a, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.kind === 'banned_form'
                            ? 'bg-red-100 text-red-600 line-through'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {a.alias_text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {canPropose && (
                <div className="mb-5">
                  {showPropose ? (
                    <form
                      onSubmit={propose}
                      className="bg-accent-subtle border border-accent/20 rounded-xl p-4 space-y-3"
                    >
                      <p className="text-xs font-semibold text-accent">Propose new version</p>
                      <input
                        value={proposeValue}
                        onChange={(e) => setProposeValue(e.target.value)}
                        required
                        placeholder="New value text"
                        className="w-full px-3 py-2 text-sm border border-subtle rounded-lg focus:outline-none focus:border-accent bg-surface text-main"
                      />
                      <input
                        value={proposeNote}
                        onChange={(e) => setProposeNote(e.target.value)}
                        placeholder="Change note (optional)"
                        className="w-full px-3 py-2 text-sm border border-subtle rounded-lg focus:outline-none focus:border-accent bg-surface text-main"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={proposing}
                          className="px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                          {proposing ? 'Saving…' : 'Propose'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPropose(false)}
                          className="px-3 py-1.5 text-sm text-muted hover:text-main"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowPropose(true)}
                      className="text-sm text-accent hover:opacity-80 font-medium"
                    >
                      + Propose new version
                    </button>
                  )}
                </div>
              )}

              <VersionTimeline
                versions={detail.versions}
                factId={detail.id}
                onAction={load}
                userRole={userRole}
              />
            </>
          ) : (
            <p className="text-red-500 text-sm">Failed to load</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Create fact modal ────────────────────────────────────────────────────────

function CreateFactModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState('statistic')
  const [valueText, setValueText] = useState('')
  const [valueNumber, setValueNumber] = useState('')
  const [valueUnit, setValueUnit] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await factsApi.create({
        key: key.trim().toLowerCase().replace(/\s+/g, '_'),
        label,
        category,
        value_text: valueText,
        value_number: valueNumber ? parseFloat(valueNumber) : null,
        value_unit: valueUnit || null,
      })
      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full px-3 py-2 text-sm border border-subtle rounded-lg focus:outline-none focus:border-accent bg-surface text-main'

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-modal rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle">
          <h3 className="font-bold text-main font-newsreader">New Fact</h3>
          <button onClick={onClose} className="text-muted hover:text-main p-1 rounded-lg hover:bg-accent-subtle">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Key</label>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
                placeholder="customer_count"
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputCls}
              >
                {['statistic', 'pricing', 'certification', 'name', 'person', 'award', 'embargo', 'location', 'other'].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="Human-readable label"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Value</label>
            <input
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
              required
              placeholder="e.g. 50,000+ customers"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Numeric value</label>
              <input
                value={valueNumber}
                onChange={(e) => setValueNumber(e.target.value)}
                type="number"
                placeholder="50000"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Unit</label>
              <input
                value={valueUnit}
                onChange={(e) => setValueUnit(e.target.value)}
                placeholder="customers, USD…"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-main">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-accent text-white text-sm rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Fact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function RepositoryPage() {
  const { user } = useAuth()
  const { isAuthority } = useTheme()
  const [tab, setTab] = useState<Tab>('facts')
  const [facts, setFacts] = useState<Fact[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFact, setSelectedFact] = useState<Fact | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')

  const canCreate = ['admin', 'brand_manager'].includes(user?.role ?? '')

  const load = () => {
    setLoading(true)
    Promise.all([factsApi.list(), rulesApi.list()])
      .then(([f, r]) => {
        setFacts(f)
        setRules(r)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const categoryColors: Record<string, string> = {
    statistic: 'bg-blue-100 text-blue-700',
    pricing: 'bg-emerald-100 text-emerald-700',
    certification: 'bg-purple-100 text-purple-700',
    name: 'bg-yellow-100 text-yellow-700',
    person: 'bg-pink-100 text-pink-700',
    award: 'bg-orange-100 text-orange-700',
    embargo: 'bg-red-100 text-red-700',
    location: 'bg-teal-100 text-teal-700',
    other: 'bg-gray-100 text-gray-500',
  }

  const severityDot: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-400',
    low: 'bg-gray-400',
  }

  const filteredFacts = facts.filter(
    (f) =>
      !search ||
      f.label.toLowerCase().includes(search.toLowerCase()) ||
      f.key.toLowerCase().includes(search.toLowerCase()) ||
      f.value_text?.toLowerCase().includes(search.toLowerCase()),
  )
  const filteredRules = rules.filter(
    (r) =>
      !search ||
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.key.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto p-6 pb-12">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1
            className={`text-main ${isAuthority ? 'font-newsreader text-3xl' : 'font-jakarta text-2xl font-bold'}`}
          >
            Fact & Rule Repository
          </h1>
          <p className="text-sm text-muted mt-1">Approved facts and brand governance rules with version history.</p>
        </div>
        {canCreate && tab === 'facts' && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus size={15} strokeWidth={2} />
            New Fact
          </button>
        )}
      </div>

      {/* Tabs + search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-canvas-secondary p-1 rounded-lg">
          {(['facts', 'rules'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                tab === t ? 'bg-surface text-accent shadow-sm' : 'text-muted hover:text-main'
              }`}
            >
              {t === 'facts' ? `Facts (${facts.length})` : `Rules (${rules.length})`}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="pl-9 pr-3 py-1.5 text-sm border border-subtle rounded-lg focus:outline-none focus:border-accent bg-surface text-main w-56"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-canvas-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tab === 'facts' ? (
        <div className="rounded-xl glass-panel overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-subtle bg-canvas-secondary/50">
                {['Key', 'Label', 'Category', 'Value', 'Status', 'Expires'].map((h) => (
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
              {filteredFacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                    No facts found
                  </td>
                </tr>
              ) : (
                filteredFacts.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => setSelectedFact(f)}
                    className="governance-row cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted">{f.key}</td>
                    <td className="px-4 py-3 font-medium text-main">{f.label}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          categoryColors[f.category] ?? 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {f.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted max-w-xs truncate text-xs">{f.value_text ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={f.version_status ?? 'draft'} />
                    </td>
                    <td className="px-4 py-3"><ExpiryChip expiresAt={f.expires_at} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl glass-panel overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-subtle bg-canvas-secondary/50">
                {['Key', 'Label', 'Category', 'Severity', 'Description', 'Status'].map((h) => (
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
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted text-sm">
                    No rules found
                  </td>
                </tr>
              ) : (
                filteredRules.map((r) => (
                  <tr key={r.id} className="governance-row">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-accent">{r.key}</td>
                    <td className="px-4 py-3 font-medium text-main">{r.label}</td>
                    <td className="px-4 py-3 text-xs text-muted capitalize">{r.category}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${severityDot[r.severity] ?? 'bg-gray-400'}`} />
                        <span className="text-xs text-main capitalize">{r.severity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted max-w-xs truncate">
                      {r.description ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.version_status ?? 'draft'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {selectedFact && (
        <FactModal fact={selectedFact} onClose={() => setSelectedFact(null)} userRole={user?.role ?? ''} />
      )}
      {showCreate && <CreateFactModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  )
}
