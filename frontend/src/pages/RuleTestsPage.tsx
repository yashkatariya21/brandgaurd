import React, { useEffect, useState } from 'react'
import { Atom, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
import { rulesApi, chaosApi, Rule, ChaosCase, ChaosIssue, ChaosRunResult, RuleConflict, RulebookCoverage, CheckerChaosResult, HumanReviewResult, ReviewComparison } from '../api'
import { useTheme } from '../theme'
import AIDisclaimerFooter from '../components/AIDisclaimerFooter'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function AgreementBadge({ agreement, isAmbiguous }: { agreement: number; isAmbiguous: boolean }) {
  if (!isAmbiguous) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
        <CheckCircle2 size={12} /> Interpretations agree here
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
      <svg width={120} height={120} viewBox="0 0 100 100" aria-label={`Cases not flagged ambiguous: ${clarityPct}%`}>
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
          not flagged
        </text>
      </svg>
      <p className="text-xs text-muted text-center">
        Cases not flagged ambiguous across {nInterpreters} readings
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
  const [checkerResult, setCheckerResult] = useState<CheckerChaosResult | null>(null)
  const [checkerBusy, setCheckerBusy] = useState(false)
  const [reviewResult, setReviewResult] = useState<HumanReviewResult | null>(null)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewHistory, setReviewHistory] = useState<{run_id: string; created_at: string; version_no: number; case_count: number}[]>([])
  const [historyError, setHistoryError] = useState('')
  const [compareId, setCompareId] = useState('')
  const [reviewExamples, setReviewExamples] = useState('')
  const [reviewDiff, setReviewDiff] = useState<ReviewComparison | null>(null)
  const [coverage, setCoverage] = useState<RulebookCoverage | null>(null)
  const [coverageError, setCoverageError] = useState('')
  const [conflicts, setConflicts] = useState<RuleConflict[]>([])
  const [conflictError, setConflictError] = useState('')
  const [conflictBusy, setConflictBusy] = useState(false)
  const [ruleLoadError, setRuleLoadError] = useState('')
  const [rules, setRules] = useState<Rule[]>([])
  const [selectedRuleId, setSelectedRuleId] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ChaosRunResult | null>(null)
  const [error, setError] = useState('')
  const [localCases, setLocalCases] = useState<ChaosCase[]>([])
  const [localIssues, setLocalIssues] = useState<ChaosIssue[]>([])

  useEffect(() => {
    chaosApi.coverage().then(setCoverage).catch(() => setCoverageError('Could not load rulebook coverage.'))
    chaosApi.contradictions().then((r) => setConflicts(r.contradictions))
      .catch(() => setConflictError('Could not load rulebook conflicts.'))
    rulesApi.list().then((rs) => {
      // Tone rules first, then others — chaos testing only supports tone.
      const tone = rs.filter((r) => r.category === 'tone')
      const rest = rs.filter((r) => r.category !== 'tone')
      setRules([...tone, ...rest])
      if (tone.length > 0) setSelectedRuleId(tone[0].id)
    }).catch((e: unknown) => setRuleLoadError(e instanceof Error ? e.message : 'Could not load rules.'))
  }, [])

  useEffect(() => {
    let current = true
    setReviewHistory([]); setHistoryError(''); setCompareId(''); setReviewDiff(null)
    if (selectedRuleId) chaosApi.reviewHistory(selectedRuleId)
      .then(r => { if (current) setReviewHistory(r.runs) })
      .catch(e => { if (current) setHistoryError(e instanceof Error ? e.message : 'Could not load review history.') })
    return () => { current = false }
  }, [selectedRuleId])

  const openReviewRun = async (runId: string) => {
    if (!selectedRuleId || !runId) return
    setReviewBusy(true); setError(''); setCompareId(''); setReviewDiff(null)
    try {
      const run = await chaosApi.getRun(runId)
      if (run.run.prompt_version !== 'review-cases-v1') throw new Error('This is not a human review run.')
      setReviewResult({run_id: runId, rule_key: rules.find(r => r.id === selectedRuleId)?.key ?? '',
        note: 'Saved source expectations and reviewer labels; no automated interpretations were run.',
        cases: run.cases.map(c => ({id: c.id, text: c.text, axis: c.axis,
          intended_label: c.intended_label, human_label: c.human_label ?? null}))})
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load the review run.') }
    finally { setReviewBusy(false) }
  }

  const resolveConflict = async (conflict: RuleConflict, status: 'accepted' | 'rejected') => {
    setConflictError(''); setConflictBusy(true)
    try {
      await chaosApi.resolveConflict(conflict.version_a, conflict.version_b, status)
      setConflicts((await chaosApi.contradictions()).contradictions)
    } catch (e) { setConflictError(e instanceof Error ? e.message : 'Could not save decision.') }
    finally { setConflictBusy(false) }
  }

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

  const runChecker = async () => {
    if (!selectedRuleId) return
    setCheckerBusy(true); setError(''); setCheckerResult(null)
    try { setCheckerResult(await chaosApi.checkerChaos(selectedRuleId)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Checker test failed') }
    finally { setCheckerBusy(false) }
  }

  const runHumanReview = async () => {
    if (!selectedRuleId) return
    const examples = reviewExamples.split('\n').map(text => text.trim()).filter(Boolean)
    if (examples.length > 10 || examples.some(text => text.length > 2000)) {
      setError('Add at most 10 examples, each no longer than 2,000 characters.')
      return
    }
    setReviewBusy(true); setError(''); setReviewResult(null); setCompareId(''); setReviewDiff(null)
    try {
      const created = await chaosApi.reviewCases(selectedRuleId, examples)
      setReviewResult(created)
      try { setReviewHistory((await chaosApi.reviewHistory(selectedRuleId)).runs); setHistoryError('') }
      catch { setHistoryError('Run created, but its history could not be refreshed.') }
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not create review cases.') }
    finally { setReviewBusy(false) }
  }

  const labelReviewCase = async (caseId: string, label: string) => {
    if (!label) return
    setError('')
    try {
      await chaosApi.labelCase(caseId, label)
      setReviewResult((r) => r ? { ...r, cases: r.cases.map(c => c.id === caseId ? { ...c, human_label: label } : c) } : null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the label.') }
  }

  const compareReview = async () => {
    if (!selectedRuleId || !reviewResult || !compareId) return
    setReviewBusy(true); setError(''); setReviewDiff(null)
    try { setReviewDiff(await chaosApi.compareReviews(selectedRuleId, compareId, reviewResult.run_id)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not compare the review sets.') }
    finally { setReviewBusy(false) }
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
          Guideline Chaos Testing
        </h1>
        <p className="text-sm text-muted mt-1">
          Use human review cases for any rule family with approved examples. Heuristic interpretations are available for tone rules only; agreement is not correctness.
        </p>
      </div>

      {ruleLoadError && <p role="alert" className="p-3 rounded bg-red-50 text-red-700">Could not load rules: {ruleLoadError}. Reload the page to retry.</p>}
      <section className="glass-panel rounded-xl p-6" aria-label="Possible rule contradictions">
        <h2 className="text-lg font-semibold text-main">Possible rule contradictions</h2>
        <p className="text-sm text-muted">Potential tensions in overlapping channels, not verdicts. Review the quoted rules and scenario.</p>
        {conflictError && <p role="alert" className="text-red-700">{conflictError}</p>}
        {!conflictError && conflicts.length === 0 && <p className="text-sm text-muted">No candidates found, or still loading.</p>}
        <ul className="space-y-3 mt-3">{conflicts.map((c) => <li key={`${c.rule_a}-${c.rule_b}`} className="border border-subtle rounded p-3 text-sm text-main">
          <strong>Possible · {c.rule_a} / {c.rule_b}</strong> · {c.channels.join(', ')}
          <p>“{c.quote_a}” / “{c.quote_b}”</p><p>Example: {c.scenario}</p><p className="text-muted">{c.explanation}</p>
          <div className="flex items-center flex-wrap gap-2 mt-3"><span className="text-xs font-semibold">Human decision: {c.status === 'accepted' ? 'Accepted as a conflict' : c.status === 'rejected' ? 'Not a conflict' : 'Not decided'}</span>
            <button type="button" disabled={conflictBusy} onClick={() => void resolveConflict(c, 'accepted')} className="text-xs border border-subtle rounded px-2 py-1 hover:bg-accent-subtle disabled:opacity-50">Accept as conflict</button>
            <button type="button" disabled={conflictBusy} onClick={() => void resolveConflict(c, 'rejected')} className="text-xs border border-subtle rounded px-2 py-1 hover:bg-accent-subtle disabled:opacity-50">Not a conflict</button></div>
        </li>)}</ul>
      </section>
      <section className="glass-panel rounded-xl p-6 space-y-3" aria-label="Rulebook coverage">
        <h2 className="text-lg font-semibold text-main">Rulebook health: coverage and gaps</h2>
        <p className="text-sm text-muted">{coverage?.note ?? 'Compare governing rules with channels and claim types found in registered content.'}</p>
        {coverageError && <p role="alert" className="text-red-700">{coverageError}</p>}
        {coverage && coverage.matrix.length === 0 && <p className="text-sm text-muted">No registered content channels yet. Register content to inspect coverage.</p>}
        {coverage && coverage.matrix.length > 0 && <div className="overflow-x-auto"><table className="text-xs text-main border-collapse w-full">
          <caption className="text-left text-muted mb-2">Counts of rules by content channel and family. Zero indicates a candidate gap.</caption>
          <thead><tr><th scope="col" className="p-2 text-left">Channel</th>{coverage.families.map(f => <th scope="col" className="p-2 text-left" key={f}>{f}</th>)}{coverage.claim_types.map(f => <th scope="col" className="p-2 text-left" key={f}>claim: {f}</th>)}</tr></thead>
          <tbody>{coverage.matrix.map(row => <tr key={row.channel}><th scope="row" className="p-2 text-left">{row.channel}</th>{coverage.families.map(f => <td className="p-2 border border-subtle" key={f}>{row.families[f]}</td>)}{coverage.claim_types.map(f => <td className="p-2 border border-subtle" key={f}>{row.claim_types[f]}</td>)}</tr>)}</tbody>
        </table></div>}
        {coverage && <details><summary className="cursor-pointer text-sm font-medium text-main">Possible gaps and untested rules ({coverage.gaps.length})</summary>
          <ul className="space-y-2 mt-3">{coverage.gaps.map((gap, i) => <li key={i} className="text-sm text-main border border-subtle rounded p-2"><strong>{gap.kind.replace(/_/g, ' ')} · {gap.subject}</strong>{gap.channel ? ` · ${gap.channel}` : ''}{gap.title ? ` · ${gap.title}` : ''}<p className="text-muted">{gap.evidence}</p></li>)}</ul>
        </details>}
      </section>
      {/* Control panel */}
      <div className="glass-panel rounded-xl p-6">
        <h2 className="text-sm font-semibold text-main mb-4 flex items-center gap-2">
          <Atom size={15} /> Configure rule tests
        </h2>
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-medium text-muted mb-1">Select rule</label>
            <select
              value={selectedRuleId}
              onChange={(e) => {
                setSelectedRuleId(e.target.value)
                setResult(null); setCheckerResult(null); setReviewResult(null); setReviewExamples('')
              }}
              disabled={running || checkerBusy || reviewBusy}
              className="w-full px-3 py-2 border border-subtle rounded-lg text-sm focus:outline-none focus:border-accent bg-surface text-main"
            >
              <option value="">— choose a rule —</option>
              {rules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.key} – {r.label} {r.category !== 'tone' ? `(${r.category})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            {!selectedIsTone && selectedRuleId && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                Heuristic interpretations are limited to tone rules. You can still create human review cases below.
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

        {selectedRule && <div className="mt-4 border border-subtle rounded p-3 space-y-2">
          <p className="text-sm text-main">Human review for any rule family: use saved examples or add review-only examples below. These do not change the approved rule. No automated interpretations or accuracy claims.</p>
          <label htmlFor="review-examples" className="block text-xs text-muted">Optional review examples, one per line (up to 10; 2,000 characters each)</label>
          <textarea id="review-examples" value={reviewExamples} onChange={e => setReviewExamples(e.target.value)} disabled={reviewBusy} rows={3} className="w-full border border-subtle rounded bg-surface text-main p-2 text-sm" placeholder="Enter a case for a person to review" />
          <button disabled={reviewBusy} onClick={() => void runHumanReview()} className="px-3 py-2 rounded bg-accent text-white text-sm disabled:opacity-50">{reviewBusy ? 'Loading…' : 'Create human review cases'}</button>
          {historyError && <p role="alert" className="text-xs text-red-700">{historyError}</p>}
          {reviewHistory.length > 0 && <div><label htmlFor="review-history" className="block text-xs text-muted mt-2">Open a saved review set (latest 20)</label>
            <select id="review-history" value={reviewResult?.run_id ?? ''} disabled={reviewBusy} onChange={e => void openReviewRun(e.target.value)} className="mt-1 max-w-full bg-surface border border-subtle rounded p-2 text-sm"><option value="">Choose a saved set</option>{reviewHistory.map(r => <option key={r.run_id} value={r.run_id}>v{r.version_no} · {new Date(r.created_at).toLocaleString()} · {r.case_count} cases</option>)}</select></div>}
        </div>}
        {selectedRule && ['R-04', 'R-12'].includes(selectedRule.key) && <div className="mt-4 border border-subtle rounded p-3 space-y-2">
          <p className="text-sm text-main">Deterministic checker test: try constructed product-name or active embargo variants against the existing checker. This is not an AI interpretation.</p>
          <button disabled={checkerBusy} onClick={() => void runChecker()} className="px-3 py-2 rounded bg-accent text-white text-sm disabled:opacity-50">{checkerBusy ? 'Testing checker…' : 'Run checker chaos'}</button>
        </div>}
        {selectedRule && (
          <div className="mt-4 p-3 bg-accent-subtle rounded-lg text-xs text-accent border border-accent/20">
            <span className="font-mono font-semibold">{selectedRule.key}</span> –{' '}
            {selectedRule.description ?? selectedRule.label}
          </div>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      {checkerResult && <section className="glass-panel rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-main">Checker test · {checkerResult.rule_key}</h2>
        <p className="text-sm text-main">Confirmed checker misses: {checkerResult.checker_misses}. {checkerResult.note}</p>
        <div className="border border-subtle rounded p-3 text-sm text-main"><strong>Regression comparison</strong>
          {!checkerResult.regression.previous_run_id ? <p>No earlier saved checker run for this rule.</p> : checkerResult.regression.diff && <>
            <p className="text-muted">Compared with previous saved run: {checkerResult.regression.diff.changed.length} changed, {checkerResult.regression.diff.added.length} added, {checkerResult.regression.diff.removed.length} removed, {checkerResult.regression.diff.unchanged} unchanged.</p>
            <ul className="mt-2 space-y-1">{checkerResult.regression.diff.changed.map(c => <li key={c.text}>Changed: {c.text} · expected {c.before.expected} → {c.after.expected}; checker {c.before.observed} → {c.after.observed}</li>)}{checkerResult.regression.diff.added.map(c => <li key={c.text}>Added: {c.text} · expected {c.expected}, checker {c.observed}</li>)}{checkerResult.regression.diff.removed.map(c => <li key={c.text}>Removed: {c.text} · expected {c.expected}, checker {c.observed}</li>)}</ul>
          </>}</div>
        <div className="overflow-x-auto"><table className="w-full text-sm text-main"><thead><tr><th className="text-left">Case</th><th>Expected</th><th>Checker</th><th>Observation</th></tr></thead><tbody>
          {checkerResult.cases.map(c => <tr key={c.id} className="border-t border-subtle"><td className="p-2">{c.text}<p className="text-xs text-muted">{c.rationale}</p></td><td className="p-2 text-center">{c.intended_label}</td><td className="p-2 text-center">{c.observed}</td><td className="p-2">{c.checker_miss ? 'Confirmed checker miss' : c.false_positive ? 'Checker false positive' : c.intended_label === 'borderline' ? 'Human interpretation needed' : 'As expected'}</td></tr>)}
        </tbody></table></div>
      </section>}
      {reviewResult && <section className="glass-panel rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-main">Human review · {reviewResult.rule_key}</h2>
        <p className="text-xs text-muted">{reviewResult.note} Run ID: {reviewResult.run_id}</p>
        {reviewHistory.some(r => r.run_id !== reviewResult.run_id) && <div className="border border-subtle rounded p-3 space-y-2">
          <label htmlFor="review-compare" className="block text-xs text-muted">Compare this set with another saved set</label>
          <select id="review-compare" className="bg-surface border border-subtle rounded p-2 text-sm max-w-full" value={compareId} disabled={reviewBusy} onChange={e => {setCompareId(e.target.value); setReviewDiff(null)}}><option value="">Choose earlier set</option>{reviewHistory.filter(r => r.run_id !== reviewResult.run_id).map(r => <option key={r.run_id} value={r.run_id}>v{r.version_no} · {new Date(r.created_at).toLocaleString()}</option>)}</select>{' '}
          <button disabled={!compareId || reviewBusy} onClick={() => void compareReview()} className="px-3 py-2 rounded bg-accent text-white text-sm disabled:opacity-50">Save comparison</button>
          {reviewDiff && <div className="text-sm text-main space-y-1"><p>{reviewDiff.note}</p><p>{reviewDiff.diff.changed.length} changed · {reviewDiff.diff.added.length} added · {reviewDiff.diff.removed.length} removed · {reviewDiff.diff.unchanged} unchanged</p>
            <ul className="space-y-1">{reviewDiff.diff.changed.map(c => <li key={c.text}>Changed: {c.text} · expected {c.before.expected} → {c.after.expected}; human {c.before.human_label ?? 'unlabelled'} → {c.after.human_label ?? 'unlabelled'}</li>)}{reviewDiff.diff.added.map(c => <li key={c.text}>Added: {c.text} · human {c.human_label ?? 'unlabelled'}</li>)}{reviewDiff.diff.removed.map(c => <li key={c.text}>Removed: {c.text} · human {c.human_label ?? 'unlabelled'}</li>)}</ul>
            <p className="text-xs text-muted">Saved snapshot {reviewDiff.comparison_id}. Later label changes do not alter this comparison; create another to refresh.</p></div>}
        </div>}
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">Case</th><th className="text-left">Source expectation</th><th className="text-left">Human label</th></tr></thead><tbody>
          {reviewResult.cases.map(c => <tr key={c.id} className="border-t border-subtle"><td className="p-2">{c.text}<p className="text-xs text-muted">{c.axis.replace(/_/g, ' ')}</p></td><td className="p-2">{c.axis === 'source_example' ? c.intended_label : 'Needs review'}</td><td className="p-2"><select aria-label={`Human label for ${c.text}`} className="bg-surface border border-subtle rounded p-1" value={c.human_label ?? ''} onChange={e => void labelReviewCase(c.id, e.target.value)}><option value="">Not labelled</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="borderline">Borderline</option></select></td></tr>)}
        </tbody></table></div>
      </section>}
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
              <p className="text-sm text-muted">Cases not flagged</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-main font-mono-numbers">{result.n_interpreters}</p>
              <p className="text-sm text-muted">Interpretations / case</p>
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
                <p className="font-semibold">Demo mode · heuristic interpretations</p>
                <p className="mt-0.5">
                  {result.demo_note ??
                    'Interpretations use lightweight heuristics. Hosted calls are disabled until a spending cap is enforced.'}
                </p>
                <p className="mt-0.5 text-amber-700">
                  Agreement measures consistency, not correctness. Human labels are reviewer judgments.
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
                <span>Label cases with a human judgment</span>
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

      {!result && !reviewResult && !checkerResult && !running && (
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
