import React, { useEffect, useState } from 'react'
import { rulesApi, chaosApi, Rule, ChaosCase, ChaosIssue, ChaosRunResult } from '../api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function AgreementBadge({ agreement, isAmbiguous }: { agreement: number; isAmbiguous: boolean }) {
  if (!isAmbiguous) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
        ✓ Rule is clear here
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
      ⚠ Ambiguous – human label needed ({Math.round(agreement * 100)}% agree)
    </span>
  )
}

function IntendedBadge({ label }: { label: string }) {
  const map: Record<string, string> = {
    pass: 'bg-green-100 text-green-700',
    fail: 'bg-red-100 text-red-700',
    borderline: 'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${map[label] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}

function VerdictSummary({ verdicts }: { verdicts: string[] }) {
  if (!verdicts || verdicts.length === 0) return null
  const counts: Record<string, number> = {}
  for (const v of verdicts) counts[v] = (counts[v] ?? 0) + 1
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const total = verdicts.length
  if (sorted.length === 1) {
    return (
      <span className="text-xs text-gray-500">
        All {total} agree: <strong>{sorted[0][0]}</strong>
      </span>
    )
  }
  return (
    <span className="text-xs text-gray-500">
      Readers split: {sorted.map(([v, c]) => `${c}× ${v}`).join(', ')}
    </span>
  )
}

// ─── Case row ────────────────────────────────────────────────────────────────

function CaseRow({
  c, onLabel,
}: {
  c: ChaosCase
  onLabel: (id: string, label: string) => Promise<void>
}) {
  const [labelling, setLabelling] = useState(false)

  const doLabel = async (label: string) => {
    setLabelling(true)
    try { await onLabel(c.id, label) } finally { setLabelling(false) }
  }

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 ${c.is_ambiguous ? 'bg-amber-50/30' : ''}`}>
      {/* Case text */}
      <td className="px-4 py-3 max-w-xs">
        <p className="text-sm text-gray-900 leading-snug">{c.text}</p>
        <span className="text-xs text-gray-400 mt-0.5 inline-block capitalize">{c.axis}</span>
      </td>
      {/* Expected label */}
      <td className="px-3 py-3">
        <IntendedBadge label={c.intended_label} />
      </td>
      {/* AI readers */}
      <td className="px-3 py-3">
        <VerdictSummary verdicts={c.verdicts ?? []} />
      </td>
      {/* Result */}
      <td className="px-3 py-3">
        <AgreementBadge agreement={c.agreement} isAmbiguous={c.is_ambiguous} />
      </td>
      {/* Human label + actions */}
      <td className="px-3 py-3">
        {c.human_label ? (
          <span className="text-xs text-indigo-600 font-medium">
            Labelled: <strong>{c.human_label}</strong>
          </span>
        ) : (
          <div className="flex gap-1">
            {(['pass', 'fail', 'borderline'] as const).map((l) => (
              <button
                key={l}
                disabled={labelling}
                onClick={() => doLabel(l)}
                className={`text-xs px-2 py-1 rounded border font-medium transition-colors disabled:opacity-50 ${
                  l === 'pass'
                    ? 'border-green-300 text-green-700 hover:bg-green-50'
                    : l === 'fail'
                    ? 'border-red-300 text-red-700 hover:bg-red-50'
                    : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </td>
    </tr>
  )
}

// ─── Issue card ───────────────────────────────────────────────────────────────

function IssueCard({
  issue,
  onResolve,
}: {
  issue: ChaosIssue
  onResolve: (id: string, status: 'accepted' | 'rejected') => Promise<void>
}) {
  const [resolving, setResolving] = useState(false)

  const doResolve = async (status: 'accepted' | 'rejected') => {
    setResolving(true)
    try { await onResolve(issue.id, status) } finally { setResolving(false) }
  }

  return (
    <div className={`border rounded-xl p-4 ${
      issue.status === 'open'
        ? 'border-amber-200 bg-amber-50'
        : issue.status === 'accepted'
        ? 'border-green-200 bg-green-50'
        : 'border-gray-200 bg-gray-50'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              ⚠ Ambiguity detected
            </span>
            {issue.status !== 'open' && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                issue.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {issue.status}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-800 mb-2">{issue.description}</p>
          {issue.suggested_clarification && (
            <div className="bg-white border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-gray-600 mb-1">Suggested clarification:</p>
              <p className="text-sm text-gray-700 italic">"{issue.suggested_clarification}"</p>
            </div>
          )}
        </div>
        {issue.status === 'open' && (
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              disabled={resolving}
              onClick={() => doResolve('accepted')}
              className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              Accept clarification
            </button>
            <button
              disabled={resolving}
              onClick={() => doResolve('rejected')}
              className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RuleTestsPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [selectedRuleId, setSelectedRuleId] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ChaosRunResult | null>(null)
  const [error, setError] = useState('')
  // Local state for human labels / issue resolutions (merged into result)
  const [localCases, setLocalCases] = useState<ChaosCase[]>([])
  const [localIssues, setLocalIssues] = useState<ChaosIssue[]>([])

  // Load tone rules only
  useEffect(() => {
    rulesApi.list().then((rs) => {
      const tone = rs.filter((r) => r.category === 'tone')
      setRules(tone)
      if (tone.length > 0) setSelectedRuleId(tone[0].id)
    })
  }, [])

  const runTest = async () => {
    if (!selectedRuleId) return
    setRunning(true); setError(''); setResult(null); setLocalCases([]); setLocalIssues([])
    try {
      const r = await chaosApi.run(selectedRuleId)
      setResult(r)
      setLocalCases(r.cases)
      setLocalIssues(r.issues)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Test failed')
    } finally {
      setRunning(false)
    }
  }

  const handleLabel = async (caseId: string, label: string) => {
    await chaosApi.labelCase(caseId, label)
    setLocalCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, human_label: label } : c))
    )
  }

  const handleResolve = async (issueId: string, status: 'accepted' | 'rejected') => {
    await chaosApi.resolveIssue(issueId, status)
    setLocalIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status } : i))
    )
  }

  const selectedRule = rules.find((r) => r.id === selectedRuleId)
  const clearCases = localCases.filter((c) => !c.is_ambiguous)
  const ambiguousCases = localCases.filter((c) => c.is_ambiguous)

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rule Tests</h1>
        <p className="text-gray-500 mt-1">
          Test tone rules for ambiguity by running {result?.n_interpreters ?? 5} independent AI readers over generated cases.
          High agreement = clear rule. Low agreement = rule needs clarification.
        </p>
      </div>

      {/* Control panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Configure Test (tone rules only – Round 2)</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Select tone rule</label>
            <select
              value={selectedRuleId}
              onChange={(e) => { setSelectedRuleId(e.target.value); setResult(null) }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— choose a tone rule —</option>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.key} – {r.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={runTest}
            disabled={running || !selectedRuleId}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Testing…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Run Test
              </>
            )}
          </button>
        </div>

        {selectedRule && (
          <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-xs text-indigo-700">
            <span className="font-mono font-semibold">{selectedRule.key}</span>
            {' – '}
            {selectedRule.description ?? selectedRule.label}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      {result && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-900">{result.cases_count}</p>
              <p className="text-sm text-gray-500">Cases tested</p>
            </div>
            <div className={`border rounded-xl p-4 ${result.ambiguous_count > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-2xl font-bold ${result.ambiguous_count > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                {result.ambiguous_count}
              </p>
              <p className="text-sm text-gray-500">Ambiguous</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-700">{clearCases.length}</p>
              <p className="text-sm text-gray-500">Clear cases</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-900">{result.n_interpreters}</p>
              <p className="text-sm text-gray-500">AI readers / case</p>
            </div>
          </div>

          {/* Mode badge */}
          {result.mode === 'demo' && (
            <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <span className="text-lg flex-shrink-0">⚠️</span>
              <div>
                <p className="font-semibold">Demo mode (no OPENAI_API_KEY set)</p>
                <p className="mt-0.5">{result.demo_note ?? 'Interpretations use lightweight heuristics. Set OPENAI_API_KEY for real AI readers.'}</p>
                <p className="mt-0.5 text-amber-700">Agreement score measures how clear the rule is – not whether the verdict is correct. Human labels are ground truth.</p>
              </div>
            </div>
          )}

          {/* Ambiguity issues */}
          {localIssues.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Ambiguity Issues</h3>
              <div className="space-y-3">
                {localIssues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} onResolve={handleResolve} />
                ))}
              </div>
            </div>
          )}

          {/* Cases table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Test Cases</h3>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  Ambiguous row
                </span>
                <span>|</span>
                <span>Label cases to establish ground truth</span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-64">Case text</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expected</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">AI readers</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Result</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Human label</th>
                </tr>
              </thead>
              <tbody>
                {localCases.map((c) => (
                  <CaseRow key={c.id} c={c} onLabel={handleLabel} />
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Run ID: <span className="font-mono">{result.run_id}</span> ·
            Results persist — refresh the page and re-fetch the run to see saved labels.
          </p>
        </>
      )}

      {!result && !running && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">🧪</div>
          <p className="text-lg font-medium">Select a tone rule and run the test</p>
          <p className="text-sm mt-1">
            Try <strong>R-01</strong> or <strong>R-14</strong> to see clear and ambiguous cases side by side.
          </p>
        </div>
      )}
    </div>
  )
}
