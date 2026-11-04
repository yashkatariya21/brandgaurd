import React, { useEffect, useState } from 'react'
import { factsApi, rulesApi, Fact, FactDetail, Rule } from '../api'
import { useAuth } from '../auth'
import StatusBadge from '../components/StatusBadge'

type Tab = 'facts' | 'rules'

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
    try {
      await fn()
      onAction()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Version History</h4>
      {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
      <div className="space-y-2">
        {[...versions].reverse().map((v) => (
          <div key={v.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500">v{v.version_no}</span>
                  <StatusBadge status={v.status} />
                </div>
                <p className="text-sm font-medium text-gray-900">{v.value_text}</p>
                {v.change_note && (
                  <p className="text-xs text-gray-500 mt-1">{v.change_note}</p>
                )}
                {v.approved_at && (
                  <p className="text-xs text-gray-400 mt-1">
                    Approved {new Date(v.approved_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {v.status === 'draft' && canPropose && (
                  <button
                    disabled={busy}
                    onClick={() => doAction(() => factsApi.submitVersion(factId, v.version_no))}
                    className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Submit
                  </button>
                )}
                {v.status === 'pending_approval' && canApprove && (
                  <>
                    <button
                      disabled={busy}
                      onClick={() => doAction(() => factsApi.approveVersion(factId, v.version_no))}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => doAction(() => factsApi.rejectVersion(factId, v.version_no))}
                      className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
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

function FactModal({ fact: initial, onClose, userRole }: {
  fact: Fact
  onClose: () => void
  userRole: string
}) {
  const [detail, setDetail] = useState<FactDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    factsApi.get(initial.id).then(setDetail).finally(() => setLoading(false))
  }

  useEffect(load, [initial.id])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{initial.label}</h3>
            <p className="text-sm text-gray-500 font-mono">{initial.key}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto p-6">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : detail ? (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current value</p>
                  <p className="text-sm font-medium text-gray-900">{detail.value_text}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <p className="text-sm text-gray-900 capitalize">{detail.category}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Version status</p>
                  <StatusBadge status={detail.version_status ?? 'draft'} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Expires</p>
                  <p className="text-sm text-gray-900">{detail.expires_at ?? '—'}</p>
                </div>
              </div>

              {detail.aliases.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Aliases</p>
                  <div className="flex flex-wrap gap-1">
                    {detail.aliases.map((a, i) => (
                      <span key={i}
                        className={`text-xs px-2 py-0.5 rounded ${
                          a.kind === 'banned_form'
                            ? 'bg-red-100 text-red-700 line-through'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {a.alias_text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <VersionHistory
                versions={detail.versions}
                factId={detail.id}
                onAction={load}
                userRole={userRole}
              />
            </div>
          ) : (
            <p className="text-red-500 text-sm">Failed to load</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RepositoryPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('facts')
  const [facts, setFacts] = useState<Fact[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFact, setSelectedFact] = useState<Fact | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([factsApi.list(), rulesApi.list()])
      .then(([f, r]) => { setFacts(f); setRules(r) })
      .finally(() => setLoading(false))
  }, [])

  const categoryColors: Record<string, string> = {
    statistic: 'bg-blue-100 text-blue-700',
    pricing: 'bg-green-100 text-green-700',
    certification: 'bg-purple-100 text-purple-700',
    name: 'bg-yellow-100 text-yellow-700',
    person: 'bg-pink-100 text-pink-700',
    award: 'bg-orange-100 text-orange-700',
    embargo: 'bg-red-100 text-red-700',
    location: 'bg-teal-100 text-teal-700',
    other: 'bg-gray-100 text-gray-600',
  }

  const severityColors: Record<string, string> = {
    critical: 'text-red-600',
    high: 'text-orange-600',
    medium: 'text-yellow-600',
    low: 'text-gray-500',
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Repository</h1>
        <p className="text-gray-500 mt-1">Manage approved facts and brand rules</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(['facts', 'rules'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t} {t === 'facts' ? `(${facts.length})` : `(${rules.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : tab === 'facts' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Key</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Label</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Value</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {facts.map((f) => (
                <tr
                  key={f.id}
                  onClick={() => setSelectedFact(f)}
                  className="hover:bg-indigo-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{f.key}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{f.label}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${categoryColors[f.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {f.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{f.value_text ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={f.version_status ?? 'draft'} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{f.expires_at ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Key</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Label</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Severity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-600">{r.key}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.label}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{r.category}</td>
                  <td className={`px-4 py-3 font-medium capitalize ${severityColors[r.severity] ?? 'text-gray-600'}`}>
                    {r.severity}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{r.description ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.version_status ?? 'draft'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedFact && (
        <FactModal
          fact={selectedFact}
          onClose={() => setSelectedFact(null)}
          userRole={user?.role ?? ''}
        />
      )}
    </div>
  )
}
