import React, { useEffect, useState } from 'react'
import { Crosshair, Info, ExternalLink, Zap } from 'lucide-react'
import { factsApi, Fact, BlastRadiusResult, AffectedItem } from '../api'
import { useTheme } from '../theme'
import StatusChip from '../components/StatusChip'

const channelIcons: Record<string, string> = {
  web: '🌐',
  social: '📱',
  email: '✉️',
  press: '📰',
  pdf: '📄',
  image: '🖼️',
}

function UrgencyBadge({ item }: { item: AffectedItem }) {
  if (item.registered_state === 'published')
    return <StatusChip tone="critical" label="LIVE — urgent" />
  if (item.registered_state === 'scheduled') return <StatusChip tone="high" label="Scheduled" />
  if (item.status === 'in_review') return <StatusChip tone="review" label="In Review" />
  return <StatusChip tone="low" label="Draft" />
}

export default function BlastRadiusPage() {
  const { isAuthority } = useTheme()
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
  const confirmed =
    result?.summary?.confirmed ??
    result?.affected.filter((a) => a.match_type === 'confirmed').length ??
    0
  const possible =
    result?.summary?.possible ??
    result?.affected.filter((a) => a.match_type === 'possible').length ??
    0

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto p-6 pb-12">
      <div className="mb-2">
        <h1
          className={`text-main ${isAuthority ? 'font-newsreader text-3xl' : 'font-jakarta text-2xl font-bold'}`}
        >
          Blast Radius
        </h1>
        <p className="text-sm text-muted mt-1">
          When a fact value changes, see every content asset that references the old value.
        </p>
      </div>

      {/* Control panel */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-sm font-semibold text-main mb-4 flex items-center gap-2">
          <Crosshair size={15} /> Configure Scan
        </h2>
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-medium text-muted mb-1">Select fact</label>
            <select
              value={selectedFactId}
              onChange={(e) => {
                setSelectedFactId(e.target.value)
                setResult(null)
              }}
              className="w-full px-3 py-2 border border-subtle rounded-lg text-sm focus:outline-none focus:border-accent bg-surface text-main"
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
            className="flex items-center gap-2 px-5 py-2 bg-accent text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scanning…
              </>
            ) : (
              <>
                <Zap size={15} /> Run Blast Radius Scan
              </>
            )}
          </button>
        </div>
        {selectedFact && (
          <div className="mt-4 p-3 bg-accent-subtle rounded-lg text-xs text-accent border border-accent/20">
            Fact: <span className="font-mono">{selectedFact.key}</span> · Current approved value:{' '}
            <span className="font-semibold">{selectedFact.value_text}</span>
          </div>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      {result && (
        <div>
          {/* Summary banner */}
          <div
            className={`rounded-xl p-5 mb-4 border ${
              result.affected_count > 0
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            }`}
          >
            <div className="flex items-center gap-6 flex-wrap">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  result.affected_count > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                }`}
              >
                {result.affected_count > 0 ? <Crosshair size={24} /> : <Info size={24} />}
              </div>
              <div className="flex-1 min-w-[240px]">
                <h3
                  className={`text-xl font-bold ${
                    result.affected_count > 0 ? 'text-red-700' : 'text-green-700'
                  }`}
                >
                  {result.affected_count > 0
                    ? `${result.affected_count} content item${result.affected_count !== 1 ? 's' : ''} reference the old value`
                    : 'No stale content found'}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
                  <span className="text-muted">
                    Fact: <strong>{result.fact_label}</strong>
                  </span>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono text-xs line-through">
                    {result.old_value}
                  </span>
                  <span className="text-muted">→</span>
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-mono text-xs font-semibold">
                    {result.new_value}
                  </span>
                </div>
              </div>
              {result.affected_count > 0 && (
                <div className="flex gap-3">
                  <div className="text-center bg-surface rounded-lg px-4 py-2 border border-red-200">
                    <p className="text-2xl font-bold text-red-700 font-mono-numbers">{confirmed}</p>
                    <p className="text-xs text-muted">Confirmed</p>
                  </div>
                  <div className="text-center bg-surface rounded-lg px-4 py-2 border border-amber-200">
                    <p className="text-2xl font-bold text-amber-600 font-mono-numbers">{possible}</p>
                    <p className="text-xs text-muted">Possible</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scope note */}
          {result.scope_note && (
            <div className="mb-4 px-4 py-2 bg-slate-50 border border-subtle rounded-lg text-xs text-muted flex items-center gap-2">
              <Info size={14} className="flex-shrink-0 text-muted/60" />
              {result.scope_note}
            </div>
          )}

          {/* Match type explainer */}
          {result.affected_count > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
              <p>
                <strong>Confirmed</strong> – exact numeric match AND the attribute matches (e.g.
                "customers" → customer_count). Needs updating.
              </p>
              <p>
                <strong>Possible – needs confirmation</strong> – value matches but the attribute
                differs or is unclear. Human review needed.
              </p>
              <p className="text-blue-600 pt-1">
                No changes are applied automatically. A human must decide on each item.
              </p>
            </div>
          )}

          {result.affected_count > 0 && (
            <div className="glass-panel rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-subtle bg-canvas-secondary/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-main">Affected Content Items</h3>
                <span className="text-xs text-muted">Sorted by urgency – fix live content first</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-subtle">
                      {['Content', 'Match Type', 'Urgency', 'Stale text', 'Replacement', 'URL'].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-[11px] font-semibold text-muted uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {result.affected.map((item) => (
                      <tr key={item.content_item_id} className="governance-row">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{channelIcons[item.channel]}</span>
                            <div>
                              <p className="font-medium text-main">{item.title}</p>
                              <p className="text-xs text-muted capitalize">
                                {item.channel} · {item.status.replace(/_/g, ' ')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip
                            tone={item.match_type ?? 'confirmed'}
                            label={
                              (item.match_type ?? 'confirmed') === 'confirmed'
                                ? 'Confirmed'
                                : 'Possible'
                            }
                          />
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
                            <a
                              href={item.published_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent hover:underline truncate max-w-[160px] inline-flex items-center gap-1"
                            >
                              <ExternalLink size={11} />
                              link
                            </a>
                          ) : (
                            <span className="text-xs text-muted/50">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-subtle bg-amber-50">
                <p className="text-xs text-amber-800">
                  <strong>Action required:</strong> Update all items marked as live or scheduled
                  before publishing. Items marked "Possible" need human confirmation. No changes
                  are applied automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !running && (
        <div className="text-center py-16 text-muted">
          <div className="w-16 h-16 rounded-full bg-accent-subtle flex items-center justify-center mx-auto mb-4">
            <Crosshair size={28} className="text-accent" />
          </div>
          <p className="text-lg font-medium text-main">Select a fact and run the scan</p>
          <p className="text-sm mt-1">
            Try <strong>customer_count</strong> – approve v2 (65,000+) in the Repository first, then
            run the scan.
          </p>
        </div>
      )}
    </div>
  )
}
