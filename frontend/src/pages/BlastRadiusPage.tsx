import React, { useEffect, useState } from 'react'
import { factsApi, Fact, BlastRadiusResult, AffectedItem } from '../api'

const channelIcons: Record<string, string> = {
  web: '🌐', social: '📱', email: '✉️', press: '📰', pdf: '📄', image: '🖼️',
}

const statusColors: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  in_review: 'bg-blue-100 text-blue-700',
  draft: 'bg-gray-100 text-gray-600',
  findings_ready: 'bg-orange-100 text-orange-700',
  analysing: 'bg-yellow-100 text-yellow-700',
}

const registeredColors: Record<string, string> = {
  published: 'text-red-600 font-semibold',
  scheduled: 'text-orange-500 font-semibold',
  none: 'text-gray-400',
}

const urgencyBadge = (item: AffectedItem): { label: string; cls: string } => {
  if (item.registered_state === 'published') return { label: '🔴 LIVE – urgent', cls: 'bg-red-100 text-red-700 border border-red-200' }
  if (item.registered_state === 'scheduled') return { label: '🟠 Scheduled', cls: 'bg-orange-100 text-orange-700 border border-orange-200' }
  if (item.status === 'in_review') return { label: '🟡 In Review', cls: 'bg-yellow-100 text-yellow-700 border border-yellow-200' }
  return { label: '⚪ Draft', cls: 'bg-gray-100 text-gray-600 border border-gray-200' }
}

export default function BlastRadiusPage() {
  const [facts, setFacts] = useState<Fact[]>([])
  const [selectedFactId, setSelectedFactId] = useState('')
  const [result, setResult] = useState<BlastRadiusResult | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    factsApi.list().then((fs) => {
      setFacts(fs)
      // Pre-select customer_count if present
      const cc = fs.find((f) => f.key === 'customer_count')
      if (cc) setSelectedFactId(cc.id)
    })
  }, [])

  const runScan = async () => {
    if (!selectedFactId) return
    setRunning(true)
    setError('')
    setResult(null)
    try {
      const r = await factsApi.blastRadius(selectedFactId)
      setResult(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed')
    } finally {
      setRunning(false)
    }
  }

  const selectedFact = facts.find((f) => f.id === selectedFactId)

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blast Radius</h1>
        <p className="text-gray-500 mt-1">
          When a fact value changes, see which content assets become stale and need updating.
        </p>
      </div>

      {/* Control panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Configure Scan</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Select fact</label>
            <select
              value={selectedFactId}
              onChange={(e) => { setSelectedFactId(e.target.value); setResult(null) }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— choose a fact —</option>
              {facts.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} ({f.key}) – current: {f.value_text ?? '?'}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={runScan}
            disabled={running || !selectedFactId}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scanning…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Run Blast Radius Scan
              </>
            )}
          </button>
        </div>

        {selectedFact && (
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
            <p className="text-xs text-indigo-700 font-medium">
              Fact: <span className="font-mono">{selectedFact.key}</span> · Current: <span className="font-semibold">{selectedFact.value_text}</span>
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Summary banner */}
          <div className={`rounded-xl p-5 mb-6 ${result.affected_count > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${result.affected_count > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                {result.affected_count > 0 ? '💥' : '✅'}
              </div>
              <div>
                <h3 className={`text-xl font-bold ${result.affected_count > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {result.affected_count > 0
                    ? `${result.affected_count} content item${result.affected_count !== 1 ? 's' : ''} need updating`
                    : 'No stale content found'}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm">
                  <span className="text-gray-600">
                    Fact: <strong>{result.fact_label}</strong>
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono text-xs line-through">
                    {result.old_value}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-mono text-xs font-semibold">
                    {result.new_value}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {result.affected_count > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Affected Content Items</h3>
                <span className="text-xs text-gray-500">
                  Sorted by urgency – fix live content first
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Content</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Urgency</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stale text found</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Should be</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.affected
                    .sort((a, b) => {
                      const order = { published: 0, scheduled: 1, none: 2 }
                      return (order[a.registered_state as keyof typeof order] ?? 2) -
                             (order[b.registered_state as keyof typeof order] ?? 2)
                    })
                    .map((item) => {
                      const badge = urgencyBadge(item)
                      return (
                        <tr key={item.content_item_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span>{channelIcons[item.channel]}</span>
                              <div>
                                <p className="font-medium text-gray-900">{item.title}</p>
                                <p className="text-xs text-gray-500 capitalize">{item.channel} · {item.status.replace(/_/g, ' ')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded font-medium ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-red-100 text-red-700 px-2 py-1 rounded line-through">
                              {item.stale_text}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                              {item.new_value}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {item.published_url ? (
                              <a
                                href={item.published_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 hover:underline truncate max-w-xs block"
                              >
                                {item.published_url}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>

              {/* Visual summary */}
              <div className="px-5 py-4 border-t border-gray-200 bg-amber-50">
                <p className="text-xs text-amber-800">
                  <strong>Action required:</strong> Update all items marked as live or scheduled before publishing.
                  {' '}Items in draft can be updated at your convenience.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !running && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">💥</div>
          <p className="text-lg font-medium">Select a fact and run the scan</p>
          <p className="text-sm mt-1">
            Try <strong>customer_count</strong> to see the demo – approve v2 (65,000+) first to get the full blast-radius effect.
          </p>
        </div>
      )}
    </div>
  )
}
