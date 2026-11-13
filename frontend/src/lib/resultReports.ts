import type { BlastRadiusResult, RedTeamResult, CheckerChaosResult, HumanReviewResult, ChaosRunResult, ChaosCase, ChaosIssue } from '../api'

export type ReportSection = { heading: string; paragraphs: string[] }
export type ResultReport = { title: string; runId: string; sections: ReportSection[] }

const reviewNotice = 'Review aid only; not a compliance certificate or legal advice. A person must verify the evidence and make decisions. No changes are applied or published automatically.'
const value = (v: unknown) => v == null || v === '' ? 'Not available' : String(v)

export function blastReport(result: BlastRadiusResult): ResultReport {
  const scope = result.scope
  return {
    title: 'Brand-as-Code with Blast-Radius Intelligence', runId: value(result.run_id),
    sections: [
      { heading: 'Fact change', paragraphs: [`${result.fact_label} (${result.fact_key})`, `Previous: ${value(result.old_value)} | Current: ${value(result.new_value)}`, `Affected matches: ${result.affected_count}`] },
      { heading: 'Scope and limitations', paragraphs: [result.scope_note || 'Scan scope was not supplied by the server.', ...(scope ? [
        `Items scanned: ${scope.items_scanned}; not scanned: ${scope.items_not_scanned.length}; extracted claims: ${scope.claims_extracted}.`,
        ...scope.limits,
        ...scope.items_not_scanned.map(i => `Not scanned: ${i.title} — ${i.reason}`),
        ...scope.scanned_items.map(i => `Scanned: ${i.title} — version ${value(i.scanned_version_no)}, current at scan ${value(i.current_version_no)}${i.stale ? ' (stale)' : ''}`),
      ] : [])] },
      { heading: 'Affected content', paragraphs: result.affected.length ? result.affected.map(i =>
        `${i.match_type.toUpperCase()} | ${i.title} (${i.content_item_id}) | ${i.channel} | ${i.status} / ${i.registered_state}\nMatched passage: ${i.stale_text}\nMethod: ${value(i.match_method)}${i.similarity == null ? '' : `; similarity: ${i.similarity}`}\nSuggested replacement: ${value(i.suggested_replacement)}${i.published_url ? `\nPublished URL: ${i.published_url}` : ''}`
      ) : ['No matches were returned by this scan. This does not establish that content is current.'] },
      { heading: 'Important', paragraphs: [reviewNotice, 'Possible matches may be unrelated or current; similarity is not proof that content is stale.'] },
    ],
  }
}

export function redTeamReport(result: RedTeamResult, contentTitle: string): ResultReport {
  const findings = [...result.findings, ...result.unstable_findings]
  return {
    title: 'Adversarial Brand Red Team', runId: result.run_id,
    sections: [
      { heading: 'Run', paragraphs: [`Content: ${contentTitle}`, `Mode: ${result.mode}; model: ${result.metrics.model}${result.cached ? '; cached result' : ''}`, result.demo_note || 'Findings require human review.', `Grounding drops: ${result.metrics.ungrounded_drops}.`, 'This is a snapshot of the returned run. Current human decisions are not included; check Findings for decisions.'] },
      { heading: 'Findings', paragraphs: findings.length ? findings.map(f =>
        `${f.finding_type.toUpperCase()} | ${f.persona} | ${f.severity} | ID: ${f.id} | ${f.stable ? 'stable' : 'unstable'}\n${f.issue}\n${f.citations.map(c => `Evidence (${c.kind} ${c.ref_id}${c.version == null ? '' : ` v${c.version}`}): ${c.quote}`).join('\n') || 'No evidence supplied.'}${f.suggested_text ? `\nSuggested text (review required): ${f.suggested_text}` : ''}`
      ) : ['No grounded findings were returned. This does not establish compliance.'] },
      { heading: 'Important', paragraphs: [reviewNotice, 'Citation validation checks a source, not the correctness of the conclusion. Legal Eagle is not legal advice.', ...(result.mode === 'demo' ? ['Demo output is deterministic; repeated agreement is not a reliability measurement.'] : [])] },
    ],
  }
}

export function checkerReport(result: CheckerChaosResult): ResultReport {
  return { title: 'Guideline Chaos Testing — checker test', runId: result.run_id, sections: [
    { heading: 'Test', paragraphs: [`Rule: ${result.rule_key}`, `Mode: deterministic checker`, result.note, `Checker misses: ${result.checker_misses}`] },
    { heading: 'Cases', paragraphs: result.cases.map(c => `${c.text}\nExpected: ${c.intended_label}; observed: ${c.observed}; ${c.checker_miss ? 'checker miss' : c.false_positive ? 'false positive' : c.intended_label === 'borderline' ? 'human interpretation needed' : 'as expected'}\n${c.rationale}`) },
    { heading: 'Important', paragraphs: [reviewNotice, 'This test covers constructed inputs for the selected checker, not general rulebook correctness.'] },
  ] }
}

export function humanReviewReport(result: HumanReviewResult): ResultReport {
  return { title: 'Guideline Chaos Testing — human review', runId: result.run_id, sections: [
    { heading: 'Review set', paragraphs: [`Rule: ${result.rule_key}`, result.note] },
    { heading: 'Cases', paragraphs: result.cases.map(c => `${c.text}\nAxis: ${c.axis}; source expectation: ${c.axis === 'source_example' ? c.intended_label : 'Needs review'}; human label: ${c.human_label || 'Not labelled'}`) },
    { heading: 'Important', paragraphs: [reviewNotice, 'Human labels are reviewer judgments, not independently verified truth.'] },
  ] }
}

export function chaosReport(result: ChaosRunResult, cases: ChaosCase[], issues: ChaosIssue[]): ResultReport {
  return { title: 'Guideline Chaos Testing — interpretation test', runId: result.run_id, sections: [
    { heading: 'Test', paragraphs: [`Rule: ${result.rule_key}; mode: ${result.mode}`, `${result.cases_count} cases; ${result.ambiguous_count} flagged ambiguous.`, result.demo_note || 'Interpretations require human review.'] },
    { heading: 'Cases', paragraphs: cases.map(c => `${c.text}\nAxis: ${c.axis}; expected: ${c.intended_label}; interpretations: ${(c.verdicts || []).join(', ')}; ambiguous: ${c.is_ambiguous ? 'yes' : 'no'}; human label: ${c.human_label || 'Not labelled'}`) },
    { heading: 'Issues and decisions', paragraphs: issues.length ? issues.map(i => `${i.description}\nHuman decision: ${i.status}${i.suggested_clarification ? `\nSuggested clarification: ${i.suggested_clarification}` : ''}`) : ['No ambiguity issues returned.'] },
    { heading: 'Important', paragraphs: [reviewNotice, 'Agreement is not correctness. Demo interpretations are heuristics, not independent AI readers.'] },
  ] }
}
