import React, { useEffect, useState } from 'react'
import { factsApi, rulesApi, Fact, FactDetail, Rule } from '../api'
import { useAuth } from '../auth'
import StatusBadge from '../components/StatusBadge'

type Tab = 'facts' | 'rules'

// ── Version history inside fact detail ──────────────────────────────────────

function VersionHistory({ versions, factId, onAction, userRole }: {
  versions: FactDetail['versions']
  factId: string
  onAction: () => void
  userRole: string
}) {
  const canApprove = ['admin', 'approver'].includes(userRole)
  const canPropose = ['admin', 'brand_manager'].includes(userRole)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const doAction = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try { await fn(); onAction() }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Action failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="mt-5">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Version history</h4>
      {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
      <div className="space-y-2">
        {[...versions].reverse().map((v) => (
          <div key={v.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-400">v{v.version_no}</span>
                  <StatusBadge status={v.status} />
                </div>
                <p className="text-sm font-medium text-gray-900">{v.value_text}</p>
                {v.change_note && <p className="text-xs text-gray-400 mt-1">{v.change_note}</p>}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {v.status === 'draft' && canPropose && (
                  <button disabled={busy} onClick={() => doAction(() => factsApi.approveVersion(factId, v.version_no))}
                    className="text-xs px-2.5 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50">
                    Submit for approval
                  </button>
                )}
                {v.status === 'pending_approval' && canApprove && (
                  <>
                    <button disabled={busy} onClick={() => doAction(() => factsApi.approveVersion(factId, v.version_no))}
                      className="text-xs px-2.5 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50">
                      Approve
                    </button>
                    <button disabled={busy} onClick={() => doAction(() => factsApi.rejectVersion(factId, v.version_no))}
                      className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Fact detail modal ────────────────────────────────────────────────────────

function FactModal({ fact: initial, onClose, userRole }: {
  fact: Fact; onClose: () => void; userRole: string
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
      await factsApi.proposeVersion(initial.id, { value_text: proposeValue, change_note: proposeNote })
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{initial.label}</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{initial.key} · {initial.category}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : detail ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Current value</p>
                  <p className="text-sm font-semibold text-gray-900">{detail.value_text}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <StatusBadge status={detail.version_status ?? 'draft'} />
                </div>
                {detail.expires_at && (
                  <div className="bg-amber-50 rounded-lg p-3 col-span-2">
                    <p className="text-xs text-amber-600 font-medium">Expires: {detail.expires_at}</p>
                  </div>
                )}
              </div>

              {detail.aliases.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs text-gray-500 mb-2">Aliases & banned forms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.aliases.map((a, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.kind === 'banned_form' ? 'bg-red-100 text-red-600 line-through' : 'bg-blue-100 text-blue-700'
                      }`}>{a.alias_text}</span>
                    ))}
                  </div>
                </div>
              )}

              {canPropose && (
                <div className="mb-5">
                  {showPropose ? (
                    <form onSubmit={propose} className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold text-indigo-700">Propose new version</p>
                      <input value={proposeValue} onChange={(e) => setProposeValue(e.target.value)} required
                        placeholder="New value text"
                        className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                      <input value={proposeNote} onChange={(e) => setProposeNote(e.target.value)}
                        placeholder="Change note (optional)"
                        className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                      <div className="flex gap-2">
                        <button type="submit" disabled={proposing}
                          className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                          {proposing ? 'Saving…' : 'Propose'}
                        </button>
                        <button type="button" onClick={() => setShowPropose(false)}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setShowPropose(true)}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                      + Propose new version
                    </button>
                  )}
                </div>
              )}

              <VersionHistory versions={detail.versions} factId={detail.id} onAction={load} userRole={userRole} />
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">New Fact</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Key</label>
              <input value={key} onChange={(e) => setKey(e.target.value)} required placeholder="customer_count"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {['statistic','pricing','certification','name','person','award','embargo','location','other'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="Human-readable label"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
            <input value={valueText} onChange={(e) => setValueText(e.target.value)} required placeholder="e.g. 50,000+ customers"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Numeric value</label>
              <input value={valueNumber} onChange={(e) => setValueNumber(e.target.value)} type="number" placeholder="50000"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <input value={valueUnit} onChange={(e) => setValueUnit(e.target.value)} placeholder="customers, USD…"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
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
      .then(([f, r]) => { setFacts(f); setRules(r) })
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

  const filteredFacts = facts.filter((f) =>
    !search || f.label.toLowerCase().includes(search.toLowerCase()) ||
    f.key.toLowerCase().includes(search.toLowerCase()) ||
    f.value_text?.toLowerCase().includes(search.toLowerCase())
  )
  const filteredRules = rules.filter((r) =>
    !search || r.label.toLowerCase().includes(search.toLowerCase()) ||
    r.key.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Repository</h1>
          <p className="text-sm text-gray-500 mt-0.5">Approved facts and brand governance rules</p>
        </div>
        {canCreate && tab === 'facts' && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Fact
          </button>
        )}
      </div>

      {/* Tabs + search */}
      <div className="flex items-center justify-between border-b border-gray-200 mb-5">
        <div className="flex gap-0">
          {(['facts', 'rules'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${
                tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'facts' ? `Facts (${facts.length})` : `Rules (${rules.length})`}
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="mb-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tab === 'facts' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Key</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Label</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Value</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredFacts.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No facts found</td></tr>
              ) : filteredFacts.map((f) => (
                <tr key={f.id} onClick={() => setSelectedFact(f)}
                  className="hover:bg-indigo-50/50 cursor-pointer transition-colors group">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{f.key}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 group-hover:text-indigo-700 transition-colors">{f.label}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[f.category] ?? 'bg-gray-100 text-gray-500'}`}>
                      {f.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate text-xs">{f.value_text ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.version_status ?? 'draft'} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{f.expires_at ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Key</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Label</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Severity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRules.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No rules found</td></tr>
              ) : filteredRules.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600">{r.key}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.label}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{r.category}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${severityDot[r.severity] ?? 'bg-gray-400'}`} />
                      <span className="text-xs text-gray-700 capitalize">{r.severity}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{r.description ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.version_status ?? 'draft'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedFact && (
        <FactModal fact={selectedFact} onClose={() => setSelectedFact(null)} userRole={user?.role ?? ''} />
      )}
      {showCreate && (
        <CreateFactModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
    </div>
  )
}
