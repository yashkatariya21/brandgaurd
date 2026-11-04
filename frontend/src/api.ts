/**
 * BrandGuard API client – typed fetch functions for all endpoints.
 * JWT is stored in localStorage under the key "bg_token".
 */

const BASE = import.meta.env.VITE_API_URL ?? ''

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem('bg_token')
}

export function setToken(token: string): void {
  localStorage.setItem('bg_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('bg_token')
  localStorage.removeItem('bg_user')
  localStorage.removeItem('bg_role')
  localStorage.removeItem('bg_org_id')
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
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorised')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message ?? `HTTP ${res.status}`)
  }
  return data as T
}

const get = <T>(path: string) => request<T>('GET', path)
const post = <T>(path: string, body?: unknown) => request<T>('POST', path, body)
const patch = <T>(path: string, body?: unknown) => request<T>('PATCH', path, body)

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
  rule_id: string | null
  fact_id: string | null
  human_review_required: boolean
  content_item_id: string
  content_title: string
  decisions: Decision[]
}

export interface Decision {
  id: string
  action: string
  reason_code: string | null
  reason_text: string | null
  decided_at: string
}

export interface BlastRadiusResult {
  fact_id: string
  fact_key: string
  fact_label: string
  old_value: string
  new_value: string
  run_id: string
  affected_count: number
  affected: AffectedItem[]
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
  old_value_number: number | null
  new_value_number: number | null
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string, org_slug: string) =>
    post<LoginResponse>('/v1/auth/login', { email, password, org_slug }),
  me: () => get<MeResponse>('/v1/me'),
}

// ─── Facts ────────────────────────────────────────────────────────────────────

export const factsApi = {
  list: () => get<Fact[]>('/v1/facts'),
  get: (id: string) => get<FactDetail>(`/v1/facts/${id}`),
  create: (body: Record<string, unknown>) => post<{ fact_id: string }>('/v1/facts', body),
  proposeVersion: (factId: string, body: Record<string, unknown>) =>
    post<{ version_id: string; version_no: number }>(`/v1/facts/${factId}/versions`, body),
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
  list: () => get<Rule[]>('/v1/rules'),
  get: (id: string) => get<Rule>(`/v1/rules/${id}`),
  approveVersion: (ruleId: string, versionNo: number) =>
    post<{ status: string }>(`/v1/rules/${ruleId}/versions/${versionNo}/approve`),
  rejectVersion: (ruleId: string, versionNo: number, reason?: string) =>
    post<{ status: string }>(`/v1/rules/${ruleId}/versions/${versionNo}/reject`, { reason }),
}

// ─── Content ──────────────────────────────────────────────────────────────────

export const contentApi = {
  list: () => get<ContentItem[]>('/v1/content'),
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

export const blastRadiusApi = {
  run: (factId: string) => factsApi.blastRadius(factId),
  get: (factId: string) => get<BlastRadiusResult>(`/v1/blast-radius/${factId}`),
}
