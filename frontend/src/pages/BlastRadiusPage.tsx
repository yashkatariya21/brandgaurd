import React, { useEffect, useState } from 'react'
import { factsApi, Fact, BlastRadiusResult, AffectedItem } from '../api'

const channelIcons: Record<string, string> = {
  web: '🌐', social: '📱', email: '✉️', press: '📰', pdf: '📄', image: '🖼️',
}

function MatchTypeBadge({ type }: { type: 'confirmed' | 'possible' }) {
  if (type === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Confirmed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      Possible – needs confirmation
    </span>
  )
}

function UrgencyBadge({ item }: { item: AffectedItem }) {
  if (item.registered_state === 'published')
    return <span className="text-xs px-2 py-1 rounded font-medium bg-red-100 text-red-700 border border-red-200">🔴 LIVE – urgent</span>
  if (item.registered_state === 'scheduled')
    return <span className="text-xs px-2 py-1 rounded font-medium bg-orange-100 text-orange-700 border border-orange-200">🟠 Scheduled</span>
  if (item.status === 'in_review')
    return <span className="text-xs px-2 py-1 rounded font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">🟡 In Review</span>
  return <span className="text-xs px-2 py-1 rounded font-medium bg-gray-100 text-gray-600 border border-gray-200">⚪ Draft</span>
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
      const cc = fs.find((f) => f.key === 'customer_count')
      if (cc) setSelectedFactId(cc.id)
    })
  }, [])

  const runScan = async () => {
    if (!selectedFactId) return
    setRunning(true); setError(''); setResult(null)
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
  const confirmed = result?.summary?.confirmed ?? result?.affected.filter(a => a.match_type === 'confirmed').length ?? 0
  const possible  = result?.summary?.possible  ?? result?.affected.filter(a => a.match_type === 'possible').length ?? 0

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blast Radius</h1>
        <p className="text-gray-500 mt-1">
          When a fact value changes, see every content asset that references the old value.
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
                  {f.label} ({f.key}) – {f.value_text ?? '?'}
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
              <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Scanning…</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>Run Blast Radius Scan</>
            )}
          </button>
        </div>
        {selectedFact && (
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-xs text-indigo-700">
            Fact: <span className="font-mono">{selectedFact.key}</span> · Current approved value:{' '}
            <span className="font-semibold">{selectedFact.value_text}</span>
          </div>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      {result && (
        <div>
          {/* Summary banner */}
          <div className={`rounded-xl p-5 mb-4 ${result.affected_count > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center gap-6">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${result.affected_count > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                {result.affected_count > 0 ? '💥' : '✅'}
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${result.affected_count > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {result.affected_count > 0
                    ? `${result.affected_count} content item${result.affected_count !== 1 ? 's' : ''} reference the old value`
                    : 'No stale content found'}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
                  <span className="text-gray-600">Fact: <strong>{result.fact_label}</strong></span>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono text-xs line-through">{result.old_value}</span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-mono text-xs font-semibold">{result.new_value}</span>
                </div>
              </div>
              {/* Match type counts */}
              {result.affected_count > 0 && (
                <div className="flex gap-3">
                  <div className="text-center bg-white rounded-lg px-4 py-2 border border-red-200">
                    <p className="text-2xl font-bold text-red-700">{confirmed}</p>
                    <p className="text-xs text-gray-500">Confirmed</p>
                  </div>
                  <div className="text-center bg-white rounded-lg px-4 py-2 border border-amber-200">
                    <p className="text-2xl font-bold text-amber-600">{possible}</p>
                    <p className="text-xs text-gray-500">Possible</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scope note */}
          {result.scope_note && (
            <div className="mb-4 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {result.scope_note}
            </div>
          )}

          {/* Match type explainer */}
          {result.affected_count > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
              <p><strong>Confirmed</strong> – exact numeric match AND the attribute matches (e.g. "customers" → customer_count). Needs updating.</p>
              <p><strong>Possible – needs confirmation</strong> – value matches but the attribute differs or is unclear (e.g. "50,000 tickets" matches numerically but is about ticket volume). Human review needed to confirm whether it references this fact.</p>
              <p className="text-blue-600 pt-1">No changes are applied automatically. A human must decide on each item.</p>
            </div>
          )}

          {result.affected_count > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Affected Content Items</h3>
                <span className="text-xs text-gray-500">Sorted by urgency – fix live content first</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Content</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Match Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Urgency</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stale text found</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Suggested replacement</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.affected.map((item) => (
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
                        <MatchTypeBadge type={item.match_type ?? 'confirmed'} />
                      </td>
                      <td className="px-4 py-3">
                        <UrgencyBadge item={item} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-red-100 text-red-700 px-2 py-1 rounded line-through">
                          {item.stale_text}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                          {item.suggested_replacement || item.new_value}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.published_url ? (
                          <a href={item.published_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:underline truncate max-w-[160px] block">
                            {item.published_url}
                          </a>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-gray-200 bg-amber-50">
                <p className="text-xs text-amber-800">
                  <strong>Action required:</strong> Update all items marked as live or scheduled before publishing.
                  Items marked "Possible" need human confirmation before editing.
                  No changes are applied automatically.
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
            Try <strong>customer_count</strong> – approve v2 (65,000+) in the Repository first, then run the scan.
          </p>
        </div>
      )}
    </div>
  )
}
