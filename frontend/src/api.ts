/**
 * BrandGuard API client – typed fetch functions for all endpoints.
 * JWT is stored in sessionStorage under the key "bg_token".
 */

const BASE = ((import.meta.env as Record<string, string | undefined>).VITE_API_URL ?? '').trim().replace(/\/+$/, '')

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return sessionStorage.getItem('bg_token')
}

export function setToken(token: string): void {
  sessionStorage.setItem('bg_token', token)
}

export function clearToken(): void {
  sessionStorage.removeItem('bg_token')
  sessionStorage.removeItem('bg_user')
  sessionStorage.removeItem('bg_role')
  sessionStorage.removeItem('bg_org_id')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false,
): Promise<T> {
  const headers: Record<string, string> = { ...authHeaders() }
  if (!isFormData && body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body !== undefined
      ? JSON.stringify(body)
      : undefined,
  }).catch((err: unknown) => {
    // Network / CORS error — wrap with a clearer message
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.toLowerCase().includes('fetch') || err instanceof TypeError) {
      throw new Error('Cannot reach the backend. Check your connection and API configuration, then try again.')
    }
    throw err
  })

  if (res.status === 401 && !path.startsWith('/v1/auth/') && path !== '/v1/me') {
    clearToken()
    window.location.href = '/login'
  }

  if (res.status === 405 && path === '/v1/auth/login') {
    throw new Error('The sign-in endpoint rejected the request (HTTP 405). Check that the API URL points to the backend, not the frontend.')
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    if (res.status === 405 || res.ok) {
      throw new Error('The API endpoint did not respond as expected. Check the backend URL and configuration.')
    }
    throw new Error(`The backend returned HTTP ${res.status}. Please try again or check the API configuration.`)
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = typeof data?.message === 'string' ? data.message :
      res.status === 401 ? 'Invalid email, password or workspace.' : `HTTP ${res.status}`
    throw new Error(message)
  }
  if (data === null) throw new Error('The backend returned an invalid response.')
  return data as T
}

const get = <T>(path: string) => request<T>('GET', path)
const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body)
const del = <T>(path: string) => request<T>('DELETE', path)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string
  org_id: string
  role: string
}

export interface MeResponse {
  user: { id: string; email: string; display_name: string }
  org: { id: string; name: string; slug: string }
  role: string
}

export interface Fact {
  id: string
  key: string
  label: string
  category: string
  version_no: number
  value_text: string
  value_number: number | null
  value_unit: string | null
  qualifier: string
  version_status: string
  expires_at: string | null
  created_at: string
}

export interface FactDetail extends Fact {
  versions: FactVersion[]
  aliases: { alias_text: string; kind: string }[]
}

export interface FactVersion {
  id: string
  version_no: number
  value_text: string
  value_number: number | null
  value_unit: string | null
  qualifier: string
  status: string
  change_note: string | null
  proposed_by: string
  approved_by: string | null
  approved_at: string | null
  created_at: string
}

export interface Rule {
  id: string
  key: string
  label: string
  category: string
  severity: string
  applies_to: string[]
  version_no: number | null
  description: string | null
  version_status: string | null
  created_at: string
}

export interface ContentItem {
  id: string
  title: string
  channel: string
  status: string
  registered_state: string
  scheduled_for: string | null
  published_url: string | null
  version_no: number | null
  content_hash: string | null
  created_at: string
}

export interface ContentDetail extends ContentItem {
  body_text: string
  claims: Claim[]
  findings: FindingSummary[]
}

export interface Claim {
  id: string
  span_start: number
  span_end: number
  raw_text: string
  entity: string | null
  value_number: number | null
  value_unit: string | null
  link_status: string
  fact_id: string | null
}

export interface FindingSummary {
  id: string
  issue: string
  severity: string
  finding_type: string
  source_kind: string
  status: string
  created_at: string
  span_start: number | null
  span_end: number | null
}

export interface Finding extends FindingSummary {
  persona?: string | null
  rule_id: string | null
  fact_id: string | null
  human_review_required: boolean
  content_item_id: string
  content_title: string
  decisions: Decision[]
  debate?: Debate
}

export interface Decision {
  id: string
  action: string
  reason_code: string | null
  reason_text: string | null
  decided_at: string
}

export interface AffectedItem {
  content_item_id: string
  title: string
  channel: string
  status: string
  registered_state: string
  published_url: string | null
  span_start: number
  span_end: number
  stale_text: string
  old_value: string
  new_value: string
  suggested_replacement: string
  match_type: 'confirmed' | 'possible'
  match_method?: 'deterministic' | 'embedding' | 'offline_lexical'
  similarity?: number | null
  embedding_model?: string | null
}

export interface BlastRadiusResult {
  fact_id: string
  fact_key: string
  fact_label: string
  old_value?: string
  new_value?: string
  run_id?: string
  message?: string
  scan_performed?: boolean
  affected_count: number
  affected: AffectedItem[]
  summary?: {
    confirmed: number
    possible: number
    by_status: { draft: number; in_review: number; scheduled: number; published: number }
  }
  scope_note?: string
  scope?: {
    items_scanned: number
    items_not_scanned: Array<{content_item_id: string; title: string; reason: string}>
    scanned_items: Array<{content_item_id: string; title: string; scanned_version_no: number | null; current_version_no: number | null; stale: boolean}>
    claims_extracted: number
    limits: string[]
    graph_similarity_evaluation: {date: string; n_holdout: number; threshold: number; holdout_metrics: {precision: number | null; recall: number | null}; fixture_note: string} | null
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string, org_slug: string) =>
    post<LoginResponse>('/v1/auth/login', { email, password, org_slug }),
  me: () => get<MeResponse>('/v1/me'),
}

// ─── Facts ────────────────────────────────────────────────────────────────────

export const factsApi = {
  list: () => get<{ facts: Fact[] }>('/v1/facts').then(r => r.facts ?? (r as unknown as Fact[])),
  get: (id: string) => get<FactDetail>(`/v1/facts/${id}`),
  create: (body: Record<string, unknown>) => post<{ fact_id: string }>('/v1/facts', body),
  proposeVersion: (factId: string, body: Record<string, unknown>) =>
    post<{ version_id: string; version_no: number }>(`/v1/facts/${factId}/versions`, body),
  deleteDraft: (factId: string, versionNo: number) =>
    del<{ status: string }>(`/v1/facts/${factId}/versions/${versionNo}`),
  submitVersion: (factId: string, versionNo: number) =>
    post<{ status: string }>(`/v1/facts/${factId}/versions/${versionNo}/submit`),
  approveVersion: (factId: string, versionNo: number) =>
    post<{ status: string }>(`/v1/facts/${factId}/versions/${versionNo}/approve`),
  rejectVersion: (factId: string, versionNo: number, reason?: string) =>
    post<{ status: string }>(`/v1/facts/${factId}/versions/${versionNo}/reject`, { reason }),
  diff: (factId: string, versionNo: number) =>
    get<{ version_no: number; diff: Record<string, { before: unknown; after: unknown }> }>(
      `/v1/facts/${factId}/versions/${versionNo}/diff`,
    ),
  blastRadius: (factId: string) => post<BlastRadiusResult>(`/v1/facts/${factId}/blast-radius`),
}

// ─── Rules ────────────────────────────────────────────────────────────────────

export const rulesApi = {
  list: () => get<{ rules: Rule[] }>('/v1/rules').then(r => r.rules ?? (r as unknown as Rule[])),
  get: (id: string) => get<{ rule: Rule; versions: unknown[]; examples: unknown[] }>(`/v1/rules/${id}`),
  approveVersion: (ruleId: string, versionId: string) =>
    post<{ status: string }>(`/v1/rules/${ruleId}/versions/${versionId}/approve`, { action: 'approve' }),
  rejectVersion: (ruleId: string, versionId: string) =>
    post<{ status: string }>(`/v1/rules/${ruleId}/versions/${versionId}/approve`, { action: 'reject' }),
}

// ─── Content ──────────────────────────────────────────────────────────────────

export const contentApi = {
  list: () => get<ContentItem[]>('/v1/content'),
  deleteDraft: (id: string) => del<{ status: string }>(`/v1/content/${id}`),
  get: (id: string) => get<ContentDetail>(`/v1/content/${id}`),
  submit: (body: { title: string; channel: string; body_text: string }) =>
    post<{ content_item_id: string; version_id: string }>('/v1/content', body),
  upload: (formData: FormData) =>
    request<{ content_item_id: string; version_id: string; extracted_length: number }>(
      'POST',
      '/v1/content/upload',
      formData,
      true,
    ),
  analyse: (id: string) =>
    post<{ run_id: string; findings_count: number; findings: FindingSummary[] }>(
      `/v1/content/${id}/analyse`,
    ),
}

// ─── Findings ─────────────────────────────────────────────────────────────────

export const findingsApi = {
  list: () => get<Finding[]>('/v1/findings'),
  get: (id: string) => get<Finding>(`/v1/findings/${id}`),
  decide: (
    id: string,
    action: string,
    reason_code?: string,
    reason_text?: string,
    final_text?: string,
  ) =>
    post<{ decision_id: string; finding_status: string }>(`/v1/findings/${id}/decide`, {
      action,
      reason_code,
      reason_text,
      final_text,
    }),
}

// ─── Blast Radius ─────────────────────────────────────────────────────────────

export interface BlastRadiusSummary {
  confirmed: number
  possible: number
  by_status: { draft: number; in_review: number; scheduled: number; published: number }
}

export interface BlastRadiusResultV2 extends BlastRadiusResult {
  summary?: BlastRadiusSummary
  scope_note?: string
}

export interface AffectedItemV2 extends AffectedItem {
  match_type: 'confirmed' | 'possible'
}

export const blastRadiusApi = {
  run: (factId: string) => factsApi.blastRadius(factId),
  get: (factId: string) => get<BlastRadiusResultV2>(`/v1/blast-radius/${factId}`),
}

// ─── Red Team ─────────────────────────────────────────────────────────────────

export interface EvidenceCitation {
  kind: 'fact' | 'rule' | 'passage'
  ref_id: string
  version: number | null
  quote: string
  span_start?: number
  span_end?: number
}

export interface RedTeamFinding {
  id: string
  persona: string
  issue: string
  severity: string
  confidence: string
  why_it_matters: string | null
  suggested_text: string | null
  span_start: number | null
  span_end: number | null
  human_review_required: boolean
  finding_type: string
  source_kind: string
  citations: EvidenceCitation[]
  appearances: number
  total_runs: number
  stable: boolean
}

export interface RedTeamResult {
  run_id: string
  mode: 'llm' | 'demo'
  findings: RedTeamFinding[]
  unstable_findings: RedTeamFinding[]
  cached: boolean
  metrics: { grounding_pass_rate: number | null; ungrounded_drops: number; stability_rate: number | null; unstable_hidden: number; duration_seconds: number; model: string }
  demo_note?: string | null
}

export const redTeamApi = {
  run: (itemId: string) =>
    post<RedTeamResult>(`/v1/content/${itemId}/redteam`),
}

// ─── Debate ───────────────────────────────────────────────────────────────────

export interface Debate {
  id: string
  finding_id: string
  prosecutor_text: string
  defender_text: string
  minimal_edit: string | null
  mode: 'llm' | 'demo'
  cached: boolean
  footer: string
  evidence?: EvidenceCitation[]
  invalid_evidence_count?: number
  evidence_note?: string
  argument_citations?: { prosecutor: EvidenceCitation[]; defender: EvidenceCitation[] }
  argument_evidence_note?: string
  demo_note?: string
}

export const debateApi = {
  get: (findingId: string) =>
    post<Debate>(`/v1/findings/${findingId}/debate`),
}

// ─── Chaos Testing ────────────────────────────────────────────────────────────

export interface ChaosCase {
  id: string
  text: string
  axis: string
  intended_label: 'pass' | 'fail' | 'borderline'
  verdicts: string[]
  agreement: number
  majority_verdict: string
  is_ambiguous: boolean
  human_label?: string | null
}

export interface ChaosIssue {
  id: string
  kind: string
  description: string
  suggested_clarification: string
  status: 'open' | 'accepted' | 'rejected'
}

export interface ChaosRunResult {
  run_id: string
  rule_key: string
  mode: 'llm' | 'demo'
  n_interpreters: number
  cases_count: number
  ambiguous_count: number
  cases: ChaosCase[]
  issues: ChaosIssue[]
  demo_note?: string
}

export interface RuleConflict {
  rule_a: string; rule_b: string; quote_a: string; quote_b: string
  channels: string[]; scenario: string; type: 'possible'; explanation: string
  version_a: string; version_b: string; issue_id: string | null; status: 'open' | 'accepted' | 'rejected'
}

export interface CheckerRegressionDiff {
  added: {text: string; expected: string; observed: string}[]
  removed: {text: string; expected: string; observed: string}[]
  changed: {text: string; before: {expected: string; observed: string}; after: {expected: string; observed: string}}[]
  unchanged: number
}
export interface CheckerChaosResult {
  run_id: string
  rule_key: string
  mode: 'checker'
  checker_misses: number
  regression: { previous_run_id: string | null; diff: CheckerRegressionDiff | null }
  note: string
  cases: { id: string; text: string; intended_label: string; observed: string; checker_miss: boolean; false_positive: boolean; rationale: string }[]
}
export interface RulebookCoverage {
  channels: string[]
  families: string[]
  claim_types: string[]
  matrix: { channel: string; families: Record<string, number>; claim_types: Record<string, number> }[]
  gaps: { kind: string; channel?: string; subject: string; evidence: string; title?: string; content_id?: string }[]
  note: string
}

export interface ReviewComparison {
  comparison_id: string; rule_id: string; previous_run_id: string; current_run_id: string; note: string
  diff: {
    added: {text: string; axis: string; expected: string; human_label: string | null}[]
    removed: {text: string; axis: string; expected: string; human_label: string | null}[]
    changed: {text: string; before: {axis: string; expected: string; human_label: string | null}; after: {axis: string; expected: string; human_label: string | null}}[]
    unchanged: number
  }
}

export interface HumanReviewResult {
  run_id: string
  rule_key: string
  note: string
  cases: { id: string; text: string; axis: string; intended_label: string; human_label: string | null }[]
}

export const chaosApi = {
  compareReviews: (ruleId: string, previous_run_id: string, current_run_id: string) =>
    post<ReviewComparison>(`/v1/rules/${ruleId}/review-comparisons`, { previous_run_id, current_run_id }),
  reviewComparison: (comparisonId: string) => get<ReviewComparison>(`/v1/review-comparisons/${comparisonId}`),
  reviewHistory: (ruleId: string) => get<{ rule_key: string; runs: {run_id: string; created_at: string; version_no: number; case_count: number}[] }>(`/v1/rules/${ruleId}/review-cases`),
  reviewCases: (ruleId: string, reviewer_examples: string[] = []) => post<HumanReviewResult>(`/v1/rules/${ruleId}/review-cases`, { reviewer_examples }),
  coverage: () => get<RulebookCoverage>('/v1/rulebook/coverage'),
  checkerChaos: (ruleId: string) => post<CheckerChaosResult>(`/v1/rules/${ruleId}/checker-chaos`),
  contradictions: () => get<{ contradictions: RuleConflict[] }>('/v1/rulebook/contradictions'),
  resolveConflict: (version_a: string, version_b: string, status: 'accepted' | 'rejected') =>
    post<{ issue_id: string; status: string }>('/v1/rulebook/contradictions/resolve', { version_a, version_b, status }),
  run: (ruleId: string) =>
    post<ChaosRunResult>(`/v1/rules/${ruleId}/chaos-test`),
  getRun: (runId: string) =>
    get<{ run: Record<string, unknown>; cases: ChaosCase[]; issues: ChaosIssue[] }>(
      `/v1/chaos-runs/${runId}`,
    ),
  labelCase: (caseId: string, human_label: string) =>
    post<{ case_id: string; human_label: string }>(`/v1/chaos-cases/${caseId}/label`, {
      human_label,
    }),
  resolveIssue: (issueId: string, status: 'accepted' | 'rejected') =>
    post<{ issue_id: string; status: string }>(`/v1/chaos-issues/${issueId}/resolve`, {
      status,
    }),
}

export interface GraphNode { id: string; node_type: 'fact' | 'claim' | 'content' | 'channel'; ref_id: string; label: string; meta: Record<string, unknown> }
export interface GraphEdge { id: string; src_id: string; dst_id: string; edge_type: string; match_method: string; score: number | null; evidence: Record<string, unknown> }
export interface GraphResult { nodes: GraphNode[]; edges: GraphEdge[]; scope_note: string; limitations: string }
export interface GraphFactPaths {
  fact_id: string; fact_label: string; scope_note: string; limitations: string
  paths: { content_id: string; title: string; status: string | null; registered_state: string | null;
    channels: string[]; claim: string; span_start: number | null; span_end: number | null;
    match_type: 'confirmed' | 'possible'; method: string; score: number | null }[]
}
export const graphApi = {
  factPaths: (factId: string) => get<GraphFactPaths>(`/v1/graph/facts/${factId}/paths`),
  get: () => get<GraphResult>('/v1/graph'),
  rebuild: () => post<{nodes: number; edges: number}>('/v1/graph/rebuild'),
}
