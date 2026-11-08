/**
 * mockData.ts — NimbusDesk fictional demo data.
 * Used as fallback when the backend is unreachable, so the UI always shows
 * realistic content for demos and submissions.
 * All values are invented. Source: backend/app/seed_data.py
 */

import type { Fact, Rule, ContentItem, Finding } from '../api'

// ─── Facts ─────────────────────────────────────────────────────────────────

export const MOCK_FACTS: Fact[] = [
  { id: 'f01', key: 'customer_count',  label: 'Customer count',         category: 'statistic',    version_no: 1, value_text: '50,000+ customers',                                   value_number: 50000, value_unit: 'customers', qualifier: 'at_least',  version_status: 'approved', expires_at: '2026-12-31', created_at: '2025-10-01T00:00:00Z' },
  { id: 'f02', key: 'founding_year',   label: 'Founding year',           category: 'statistic',    version_no: 1, value_text: '2016',                                                 value_number: 2016,  value_unit: 'year',      qualifier: 'exact',     version_status: 'approved', expires_at: null,         created_at: '2016-01-01T00:00:00Z' },
  { id: 'f03', key: 'headquarters',    label: 'Headquarters',            category: 'location',     version_no: 1, value_text: 'Pune, India',                                          value_number: null,  value_unit: null,        qualifier: 'exact',     version_status: 'approved', expires_at: null,         created_at: '2016-01-01T00:00:00Z' },
  { id: 'f04', key: 'uptime_sla',      label: 'Uptime commitment',       category: 'statistic',    version_no: 1, value_text: '99.9% monthly uptime, Enterprise plan SLA only',       value_number: 99.9,  value_unit: 'percent',   qualifier: 'exact',     version_status: 'approved', expires_at: '2026-12-31', created_at: '2026-01-01T00:00:00Z' },
  { id: 'f05', key: 'starter_price',   label: 'Starter price',           category: 'pricing',      version_no: 1, value_text: '$19 per agent per month, billed annually',             value_number: 19,    value_unit: 'USD',       qualifier: 'exact',     version_status: 'approved', expires_at: '2026-12-31', created_at: '2026-01-01T00:00:00Z' },
  { id: 'f06', key: 'pro_price',       label: 'Pro price',               category: 'pricing',      version_no: 1, value_text: '$49 per agent per month, billed annually',             value_number: 49,    value_unit: 'USD',       qualifier: 'exact',     version_status: 'approved', expires_at: '2026-12-31', created_at: '2026-01-01T00:00:00Z' },
  { id: 'f07', key: 'soc2',            label: 'SOC 2 certification',     category: 'certification', version_no: 1, value_text: 'SOC 2 Type II (report period ended 2026-06-30)',      value_number: null,  value_unit: null,        qualifier: 'exact',     version_status: 'approved', expires_at: '2027-06-30', created_at: '2026-08-01T00:00:00Z' },
  { id: 'f08', key: 'iso27001',        label: 'ISO 27001 status',        category: 'certification', version_no: 1, value_text: 'Not certified. Certification in progress',             value_number: null,  value_unit: null,        qualifier: 'exact',     version_status: 'approved', expires_at: '2026-12-31', created_at: '2026-09-01T00:00:00Z' },
  { id: 'f09', key: 'first_response',  label: 'First response time',     category: 'statistic',    version_no: 1, value_text: 'Median 4 minutes in Q2 2026 internal benchmark',       value_number: 4,     value_unit: 'minutes',   qualifier: 'exact',     version_status: 'approved', expires_at: '2026-12-31', created_at: '2026-07-15T00:00:00Z' },
  { id: 'f10', key: 'ceo',             label: 'CEO',                     category: 'person',       version_no: 1, value_text: 'Maya Rao, Chief Executive Officer',                    value_number: null,  value_unit: null,        qualifier: 'exact',     version_status: 'approved', expires_at: null,         created_at: '2023-04-01T00:00:00Z' },
  { id: 'f11', key: 'names',           label: 'Approved names',          category: 'name',         version_no: 1, value_text: 'Product: NimbusDesk (one word). Feature: AutoRoute',   value_number: null,  value_unit: null,        qualifier: 'exact',     version_status: 'approved', expires_at: null,         created_at: '2024-01-01T00:00:00Z' },
  { id: 'f12', key: 'integrations',    label: 'Integrations',            category: 'statistic',    version_no: 1, value_text: '120+ integrations',                                    value_number: 120,   value_unit: 'integrations', qualifier: 'at_least', version_status: 'approved', expires_at: '2027-02-28', created_at: '2026-09-01T00:00:00Z' },
  { id: 'f13', key: 'languages',       label: 'Supported languages',     category: 'statistic',    version_no: 1, value_text: '14 supported languages',                               value_number: 14,    value_unit: 'languages', qualifier: 'exact',     version_status: 'approved', expires_at: '2027-02-28', created_at: '2026-06-01T00:00:00Z' },
  { id: 'f14', key: 'free_trial',      label: 'Free trial',              category: 'pricing',      version_no: 1, value_text: '14 days, no credit card required',                     value_number: 14,    value_unit: 'days',      qualifier: 'exact',     version_status: 'approved', expires_at: '2026-12-31', created_at: '2026-01-01T00:00:00Z' },
  { id: 'f15', key: 'award_top50',     label: 'Award claim',             category: 'award',        version_no: 1, value_text: 'Top 50 SaaS Tool 2024',                                value_number: null,  value_unit: null,        qualifier: 'exact',     version_status: 'approved', expires_at: '2025-12-31', created_at: '2024-12-01T00:00:00Z' },
  { id: 'f16', key: 'project_heron',   label: 'Embargoed project',       category: 'embargo',      version_no: 1, value_text: 'Codename Project Heron = Pro Analytics v3; embargoed until 2026-12-01', value_number: null, value_unit: null, qualifier: 'exact', version_status: 'approved', expires_at: '2026-12-01', created_at: '2026-09-15T00:00:00Z' },
]

// ─── Rules ─────────────────────────────────────────────────────────────────

export const MOCK_RULES: Rule[] = [
  { id: 'r01', key: 'R-01', label: 'Friendly and professional tone', category: 'tone',          severity: 'medium', applies_to: ['all'],             version_no: 1, description: 'Use a friendly and professional tone.',                                       version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r02', key: 'R-02', label: 'Use contractions',              category: 'tone',          severity: 'low',    applies_to: ['web','social','email'], version_no: 1, description: 'Use contractions to sound natural.',                                    version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r03', key: 'R-03', label: 'Formal external tone',          category: 'tone',          severity: 'medium', applies_to: ['external'],        version_no: 1, description: 'Maintain a formal tone in all external communications.',                      version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r04', key: 'R-04', label: 'Product name',                  category: 'terminology',   severity: 'high',   applies_to: ['all'],             version_no: 1, description: 'The product name is NimbusDesk. Never write Nimbus Desk or NimbusDESK.',    version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r05', key: 'R-05', label: 'Customers and agents',          category: 'terminology',   severity: 'low',    applies_to: ['all'],             version_no: 1, description: "Say 'customers' for client organisations and 'agents' for support staff.", version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r06', key: 'R-06', label: 'No unsupported absolute claims',category: 'claims',        severity: 'high',   applies_to: ['all'],             version_no: 1, description: 'Avoid absolute claims unless an approved fact supports them.',               version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r07', key: 'R-07', label: 'Statistics match approved facts',category: 'claims',       severity: 'high',   applies_to: ['all'],             version_no: 1, description: 'Statistics must match approved facts and name the period.',                  version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r08', key: 'R-08', label: 'No unsupported superlatives',   category: 'claims',        severity: 'high',   applies_to: ['all'],             version_no: 1, description: 'Avoid superlatives unless an approved award supports them.',                 version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r09', key: 'R-09', label: 'Short headlines',               category: 'other',         severity: 'low',    applies_to: ['web','email'],     version_no: 1, description: 'Keep headlines short.',                                                       version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r10', key: 'R-10', label: 'Alt text',                      category: 'accessibility', severity: 'medium', applies_to: ['web','email'],     version_no: 1, description: 'Every image needs alt text that describes its content.',                    version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r11', key: 'R-11', label: 'Text contrast',                 category: 'accessibility', severity: 'medium', applies_to: ['visual'],          version_no: 1, description: 'Body text contrast ratio must be at least 4.5:1.',                           version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r12', key: 'R-12', label: 'Embargo',                       category: 'embargo',       severity: 'critical', applies_to: ['external'],      version_no: 1, description: 'Do not mention embargoed names or codenames before the release date.',      version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r13', key: 'R-13', label: 'No competitor names',           category: 'claims',        severity: 'high',   applies_to: ['external'],        version_no: 1, description: 'Do not name competitors.',                                                    version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r14', key: 'R-14', label: 'Plain language',                category: 'tone',          severity: 'low',    applies_to: ['all'],             version_no: 1, description: 'Use plain language and avoid jargon.',                                        version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
  { id: 'r15', key: 'R-15', label: 'Emoji',                         category: 'tone',          severity: 'low',    applies_to: ['social','email'],  version_no: 1, description: 'Use emoji sparingly.',                                                        version_status: 'approved', created_at: '2026-01-01T00:00:00Z' },
]

// ─── Content items ─────────────────────────────────────────────────────────

export const MOCK_CONTENT: ContentItem[] = [
  { id: 'c01', title: 'Trust banner draft',        channel: 'web',    status: 'draft',     registered_state: 'none',      scheduled_for: null, published_url: null,                                        version_no: 1, content_hash: null, created_at: '2026-10-01T00:00:00Z' },
  { id: 'c02', title: 'Trust banner in review',    channel: 'web',    status: 'in_review', registered_state: 'none',      scheduled_for: null, published_url: null,                                        version_no: 1, content_hash: null, created_at: '2026-10-02T00:00:00Z' },
  { id: 'c03', title: 'Social post scheduled',     channel: 'social', status: 'approved',  registered_state: 'scheduled', scheduled_for: '2026-11-10T09:00:00+05:30', published_url: null,                version_no: 1, content_hash: null, created_at: '2026-10-03T00:00:00Z' },
  { id: 'c04', title: 'Website hero',              channel: 'web',    status: 'approved',  registered_state: 'published', scheduled_for: null, published_url: 'https://nimbusdesk.example/',               version_no: 1, content_hash: null, created_at: '2026-10-04T00:00:00Z' },
  { id: 'c05', title: 'Blog on ticket volume',     channel: 'web',    status: 'approved',  registered_state: 'published', scheduled_for: null, published_url: 'https://nimbusdesk.example/blog/tickets',   version_no: 1, content_hash: null, created_at: '2026-10-05T00:00:00Z' },
  { id: 'c06', title: 'PDF brochure',              channel: 'pdf',    status: 'approved',  registered_state: 'published', scheduled_for: null, published_url: 'https://nimbusdesk.example/brochure.pdf',   version_no: 1, content_hash: null, created_at: '2026-10-06T00:00:00Z' },
  { id: 'c07', title: 'About page',                channel: 'web',    status: 'approved',  registered_state: 'published', scheduled_for: null, published_url: 'https://nimbusdesk.example/about',          version_no: 1, content_hash: null, created_at: '2026-10-07T00:00:00Z' },
  { id: 'c08', title: 'Pricing email scheduled',   channel: 'email',  status: 'approved',  registered_state: 'scheduled', scheduled_for: '2026-11-12T09:00:00+05:30', published_url: null,                version_no: 1, content_hash: null, created_at: '2026-10-08T00:00:00Z' },
  { id: 'c09', title: 'Pricing page',              channel: 'web',    status: 'approved',  registered_state: 'published', scheduled_for: null, published_url: 'https://nimbusdesk.example/pricing',        version_no: 1, content_hash: null, created_at: '2026-10-09T00:00:00Z' },
  { id: 'c10', title: 'Award banner draft',        channel: 'web',    status: 'draft',     registered_state: 'none',      scheduled_for: null, published_url: null,                                        version_no: 1, content_hash: null, created_at: '2026-10-10T00:00:00Z' },
  { id: 'c11', title: 'Security PDF',              channel: 'pdf',    status: 'approved',  registered_state: 'published', scheduled_for: null, published_url: 'https://nimbusdesk.example/security.pdf',   version_no: 1, content_hash: null, created_at: '2026-10-11T00:00:00Z' },
  { id: 'c12', title: 'Uptime copy draft',         channel: 'web',    status: 'draft',     registered_state: 'none',      scheduled_for: null, published_url: null,                                        version_no: 1, content_hash: null, created_at: '2026-10-12T00:00:00Z' },
]

// ─── Findings ──────────────────────────────────────────────────────────────

export const MOCK_FINDINGS: Finding[] = [
  {
    id: 'fi01', issue: 'Customer count "50,000+" is superseded — approved value is now 65,000+',
    severity: 'high', finding_type: 'confirmed', source_kind: 'deterministic',
    status: 'open', persona: null, rule_id: 'r07', fact_id: 'f01',
    human_review_required: false,
    content_item_id: 'c04', content_title: 'Website hero',
    span_start: 5, span_end: 45,
    decisions: [], created_at: '2026-10-15T10:00:00Z',
  },
  {
    id: 'fi02', issue: 'Embargoed codename "Project Heron" mentioned before release date',
    severity: 'critical', finding_type: 'confirmed', source_kind: 'deterministic',
    status: 'open', persona: null, rule_id: 'r12', fact_id: 'f16',
    human_review_required: true,
    content_item_id: 'c02', content_title: 'Trust banner in review',
    span_start: null, span_end: null,
    decisions: [], created_at: '2026-10-15T11:00:00Z',
  },
  {
    id: 'fi03', issue: 'Absolute guarantee language "guaranteed 100% uptime" not supported by an approved fact',
    severity: 'high', finding_type: 'possible', source_kind: 'persona',
    status: 'open', persona: 'Legal Eagle', rule_id: 'r06', fact_id: null,
    human_review_required: true,
    content_item_id: 'c03', content_title: 'Social post scheduled',
    span_start: null, span_end: null,
    decisions: [], created_at: '2026-10-15T12:00:00Z',
  },
  {
    id: 'fi04', issue: 'Incorrect product name "Nimbus Desk" (space) — should be "NimbusDesk" (one word)',
    severity: 'high', finding_type: 'confirmed', source_kind: 'deterministic',
    status: 'open', persona: null, rule_id: 'r04', fact_id: null,
    human_review_required: false,
    content_item_id: 'c11', content_title: 'Security PDF',
    span_start: null, span_end: null,
    decisions: [], created_at: '2026-10-15T13:00:00Z',
  },
  {
    id: 'fi05', issue: 'ISO 27001 certified claim — company is not certified (certification in progress)',
    severity: 'critical', finding_type: 'confirmed', source_kind: 'deterministic',
    status: 'accepted', persona: null, rule_id: null, fact_id: 'f08',
    human_review_required: false,
    content_item_id: 'c11', content_title: 'Security PDF',
    span_start: null, span_end: null,
    decisions: [{ id: 'd01', action: 'accept', reason_code: null, reason_text: 'Flagged for immediate correction', decided_at: '2026-10-16T09:00:00Z' }],
    created_at: '2026-10-15T13:30:00Z',
  },
  {
    id: 'fi06', issue: '"Users" used instead of "customers" — brand guidelines require "customers" for client organisations',
    severity: 'low', finding_type: 'possible', source_kind: 'persona',
    status: 'dismissed', persona: 'Brand Police', rule_id: 'r05', fact_id: null,
    human_review_required: false,
    content_item_id: 'c07', content_title: 'About page',
    span_start: null, span_end: null,
    decisions: [{ id: 'd02', action: 'dismiss', reason_code: 'intended_meaning', reason_text: 'Context is technical documentation', decided_at: '2026-10-16T10:00:00Z' }],
    created_at: '2026-10-15T14:00:00Z',
  },
]
