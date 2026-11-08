import React, { useEffect, useState } from 'react'
import { Atom, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
import { rulesApi, chaosApi, Rule, ChaosCase, ChaosIssue, ChaosRunResult } from '../api'
import { useTheme } from '../theme'
import AIDisclaimerFooter from '../components/AIDisclaimerFooter'
import { MOCK_RULES } from '../lib/mockData'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function AgreementBadge({ agreement, isAmbiguous }: { agreement: number; isAmbiguous: boolean }) {
  if (!isAmbiguous) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
        <CheckCircle2 size={12} /> Rule is clear here
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
      <AlertTriangle size={12} /> Ambiguous – human label needed ({Math.round(agreement * 100)}% agree)
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

// ─── Clarity ring SVG ────────────────────────────────────────────────────────

function ClarityRing({ clarityPct, nInterpreters, mode }: {
  clarityPct: number
  nInterpreters: number
  mode: 'llm' | 'demo'
}) {
  const r = 42
  const circ = 2 * Math.PI * r
  const dash = (clarityPct / 100) * circ
  const color = clarityPct >= 80 ? '#15803d' : clarityPct >= 50 ? '#b45309' : '#dc2626'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={120} height={120} viewBox="0 0 100 100" aria-label={`Guideline clarity: ${clarityPct}%`}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
        <circle
          cx={50} cy={50} r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text x={50} y={47} textAnchor="middle" dominantBaseline="middle" fontSize={18} fontWeight="bold" fill={color}>
          {clarityPct}%
        </text>
        <text x={50} y={62} textAnchor="middle" fontSize={8} fill="#94a3b8">
          clarity
        </text>
      </svg>
      <p className="text-xs text-muted text-center">
        Guideline clarity from {nInterpreters} readings
      </p>
      {mode === 'demo' && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-center">
          Demo mode: heuristic readers, not AI
        </p>
      )}
    </div>
  )
}

// ─── Verdict dots per case ────────────────────────────────────────────────────

function VerdictDots({ verdicts }: { verdicts: string[] }) {
  if (!verdicts || verdicts.length === 0) return null
  const config: Record<string, { bg: string; label: string; letter: string }> = {
    pass:      { bg: '#15803d', label: 'Pass',      letter: 'P' },
    fail:      { bg: '#dc2626', label: 'Fail',      letter: 'F' },
    borderline:{ bg: '#b45309', label: 'Borderline', letter: 'B' },
  }
  return (
    <div className="flex items-center gap-1 flex-wrap" aria-label="Verdict dots">
      {verdicts.map((v, i) => {
        const c = config[v] ?? { bg: '#64748b', label: v, letter: '?' }
        return (
          <span
            key={i}
            title={c.label}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
            style={{ backgroundColor: c.bg }}
            aria-label={c.label}
          >
            {c.letter}
          </span>
        )
      })}
    </div>
  )
}

// ─── Case row ────────────────────────────────────────────────────────────────

function CaseRow({
  c,
  onLabel,
}: {
  c: ChaosCase
  onLabel: (id: string, label: string) => Promise<void>
}) {
  const [labelling, setLabelling] = useState(false)

  const doLabel = async (label: string) => {
    setLabelling(true)
    try {
      await onLabel(c.id, label)
    } finally {
      setLabelling(false)
    }
  }

  return (
    <tr className={`governance-row ${c.is_ambiguous ? 'bg-amber-50/40' : ''}`}>
      <td className="px-4 py-3 max-w-xs">
        <p className="text-sm text-main leading-snug">{c.text}</p>
        <span className="text-xs text-muted mt-0.5 inline-block capitalize">{c.axis}</span>
      </td>
      <td className="px-3 py-3">
        <IntendedBadge label={c.intended_label} />
      </td>
      <td className="px-3 py-3">
        <VerdictDots verdicts={c.verdicts ?? []} />
        <span className="text-xs text-muted mt-1 block">{Math.round(c.agreement * 100)}% agree</span>
      </td>
      <td className="px-3 py-3">
        <AgreementBadge agreement={c.agreement} isAmbiguous={c.is_ambiguous} />
      </td>
      <td className="px-3 py-3">
        {c.human_label ? (
          <span className="text-xs text-accent font-medium">
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
    try {
      await onResolve(issue.id, status)
    } finally {
      setResolving(false)
    }
  }

  return (
    <div
      className={`border rounded-xl p-4 ${
        issue.status === 'open'
          ? 'border-amber-200 bg-amber-50'
          : issue.status === 'accepted'
          ? 'border-green-200 bg-green-50'
          : 'border-subtle bg-canvas-secondary'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle size={12} /> Ambiguity detected
            </span>
            {issue.status !== 'open' && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  issue.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {issue.status}
              </span>
            )}
          </div>
          <p className="text-sm text-main mb-2">{issue.description}</p>
          {issue.suggested_clarification && (
            <div className="bg-surface border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-muted mb-1">Suggested clarification:</p>
              <p className="text-sm text-main italic">"{issue.suggested_clarification}"</p>
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
              className="text-xs px-3 py-1.5 border border-subtle text-muted rounded-lg hover:bg-accent-subtle disabled:opacity-50"
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
  const { isAuthority } = useTheme()
  const [rules, setRules] = useState<Rule[]>([])
  const [selectedRuleId, setSelectedRuleId] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ChaosRunResult | null>(null)
  const [error, setError] = useState('')
  const [localCases, setLocalCases] = useState<ChaosCase[]>([])
  const [localIssues, setLocalIssues] = useState<ChaosIssue[]>([])

  useEffect(() => {
    rulesApi.list().catch(() => MOCK_RULES).then((rs) => {
      // Tone rules first, then others — chaos testing only supports tone.
      const tone = rs.filter((r) => r.category === 'tone')
      const rest = rs.filter((r) => r.category !== 'tone')
      setRules([...tone, ...rest])
      if (tone.length > 0) setSelectedRuleId(tone[0].id)
    })
  }, [])

  const runTest = async () => {
    if (!selectedRuleId) return
    setRunning(true)
    setError('')
    setResult(null)
    setLocalCases([])
    setLocalIssues([])
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
    setLocalCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, human_label: label } : c)))
  }

  const handleResolve = async (issueId: string, status: 'accepted' | 'rejected') => {
    await chaosApi.resolveIssue(issueId, status)
    setLocalIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, status } : i)))
  }

  const selectedRule = rules.find((r) => r.id === selectedRuleId)
  const clearCases = localCases.filter((c) => !c.is_ambiguous)
  const selectedIsTone = selectedRule?.category === 'tone'

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto p-6 pb-12">
      <div className="mb-2">
        <h1
          className={`text-main ${isAuthority ? 'font-newsreader text-3xl' : 'font-jakarta text-2xl font-bold'}`}
        >
          Chaos Lab
        </h1>
        <p className="text-sm text-muted mt-1">
          Test tone rules for ambiguity by running {result?.n_interpreters ?? 5} independent AI
          readers over generated cases. High agreement = clear rule.
        </p>
      </div>

      {/* Control panel */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-sm font-semibold text-main mb-4 flex items-center gap-2">
          <Atom size={15} /> Configure Test (tone rules only – Round 2)
        </h2>
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-medium text-muted mb-1">Select tone rule</label>
            <select
              value={selectedRuleId}
              onChange={(e) => {
                setSelectedRuleId(e.target.value)
                setResult(null)
              }}
              className="w-full px-3 py-2 border border-subtle rounded-lg text-sm focus:outline-none focus:border-accent bg-surface text-main"
            >
              <option value="">— choose a tone rule —</option>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.key} – {r.label} {r.category !== 'tone' ? `(${r.category} — not supported)` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            {!selectedIsTone && selectedRuleId && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                Chaos testing currently supports tone rules only. Select a tone rule to run.
              </p>
            )}
            <button
              onClick={runTest}
              disabled={running || !selectedRuleId || !selectedIsTone}
              title={!selectedIsTone && selectedRuleId ? 'Chaos testing currently supports tone rules' : undefined}
              className="flex items-center gap-2 px-5 py-2 bg-accent text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Testing…
                </>
              ) : (
                <>
                  <Atom size={15} /> Run Test
                </>
              )}
            </button>
          </div>
        </div>

        {selectedRule && (
          <div className="mt-4 p-3 bg-accent-subtle rounded-lg text-xs text-accent border border-accent/20">
            <span className="font-mono font-semibold">{selectedRule.key}</span> –{' '}
            {selectedRule.description ?? selectedRule.label}
          </div>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      {result && (
        <div className="glass-panel rounded-xl">
          {/* Summary + clarity ring */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-5 border-b border-subtle items-start">
            <div>
              <p className="text-2xl font-bold text-main font-mono-numbers">{result.cases_count}</p>
              <p className="text-sm text-muted">Cases tested</p>
            </div>
            <div className={`rounded-xl p-3 ${result.ambiguous_count > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
              <p className={`text-2xl font-bold font-mono-numbers ${result.ambiguous_count > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                {result.ambiguous_count}
              </p>
              <p className="text-sm text-muted">Ambiguous</p>
            </div>
            <div className="rounded-xl p-3 bg-green-50">
              <p className="text-2xl font-bold text-green-700 font-mono-numbers">{clearCases.length}</p>
              <p className="text-sm text-muted">Clear cases</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-main font-mono-numbers">{result.n_interpreters}</p>
              <p className="text-sm text-muted">AI readers / case</p>
            </div>
            <div className="md:row-span-1 flex justify-center">
              <ClarityRing
                clarityPct={Math.round(100 * (1 - result.ambiguous_count / Math.max(result.cases_count, 1)))}
                nInterpreters={result.n_interpreters}
                mode={result.mode}
              />
            </div>
          </div>

          {result.mode === 'demo' && (
            <div className="mx-5 my-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Demo mode (no OPENAI_API_KEY set)</p>
                <p className="mt-0.5">
                  {result.demo_note ??
                    'Interpretations use lightweight heuristics. Set OPENAI_API_KEY for real AI readers.'}
                </p>
                <p className="mt-0.5 text-amber-700">
                  Agreement measures how clear the rule is – not whether the verdict is correct. Human
                  labels are ground truth.
                </p>
              </div>
            </div>
          )}

          {/* Issues */}
          {localIssues.length > 0 && (
            <div className="px-5 pb-4">
              <h3 className="text-sm font-semibold text-main mb-3 mt-2">Ambiguity Issues</h3>
              <div className="space-y-3">
                {localIssues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} onResolve={handleResolve} />
                ))}
              </div>
            </div>
          )}

          {/* Cases table */}
          <div className="px-5 pb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-main">Test Cases</h3>
              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Ambiguous row
                </span>
                <span>|</span>
                <span>Label cases to establish ground truth</span>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-subtle">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-subtle bg-canvas-secondary/50">
                    {['Case text', 'Expected', 'AI readers', 'Result', 'Human label'].map((h) => (
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
                  {localCases.map((c) => (
                    <CaseRow key={c.id} c={c} onLabel={handleLabel} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted mt-3">
              Run ID: <span className="font-mono">{result.run_id}</span> · Results persist — refresh to
              see saved labels.
            </p>
          </div>

          <AIDisclaimerFooter />
        </div>
      )}

      {!result && !running && (
        <div className="text-center py-16 text-muted">
          <div className="w-16 h-16 rounded-full bg-accent-subtle flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} className="text-accent" />
          </div>
          <p className="text-lg font-medium text-main">Select a tone rule and run the test</p>
          <p className="text-sm mt-1">
            Try <strong>R-01</strong> or <strong>R-14</strong> to see clear and ambiguous cases side by
            side.
          </p>
        </div>
      )}
    </div>
  )
}
