# BrandGuard API Contract — Round 2

Status: describes the current FastAPI implementation (`/v1` routes plus `/health`). JSON responses are shown as shapes; UUIDs and dates are serialized as strings. All `/v1` routes except register/login require `Authorization: Bearer <JWT>`. There is no API version negotiation beyond the `/v1` prefix.

## Conventions

### Roles

Roles are read from the caller's live database membership on every authenticated request.

| Action | Roles |
|---|---|
| View facts/rules and blast radius | admin, brand_manager, approver, manager, creator, external_creator |
| Propose/create facts and rules | admin, brand_manager |
| Approve/reject fact or rule versions | admin, approver; proposer cannot approve their own version |
| Submit/view content and run content analysis/Red Team | all six roles |
| View/decide findings and request a debate | all six roles |
| Run chaos tests, label cases, resolve issues | admin, brand_manager |

These are API-level role checks; RLS independently scopes business rows to the authenticated organization. Content list/detail and findings endpoints currently expose the organization-wide set to any role allowed by the corresponding action; clients must not infer “own content only” visibility.

### Errors

Errors use a common JSON body:

```json
{"error_code":"validation_failed","message":"Request validation failed","details":[]}
```

`details` is omitted/null where no details apply. Validation failures return 422. Common error codes include `auth_required` (401), `forbidden` (403), `not_found` (404), `conflict` (409), `upload_too_large` / `content_too_large` (413), and route-specific validation/analysis errors. Unknown internal failures should not be treated as successful results.

### Provider and demo mode

Red Team and debate return `mode: "llm"` only when their provider call succeeds. On provider failure, the entire Red Team run or the debate uses the deterministic demo implementation and returns `mode: "demo"` with a `demo_note`. Chaos results may return `llm`, `demo`, or `mixed`; `mixed` means one or more failed provider calls were replaced with deterministic demo output. The chaos `demo_note` describes fallback. `OPENAI_MODEL` selects the model and defaults to `gpt-4o-mini`; persisted `model_id` reflects the configured model when used and `stub` for demo-only output.

## Auth and health

| Method and path | Access | Request | Success |
|---|---|---|---|
| `GET /health` | None | — | `200 {"status":"ok"}` after a database connectivity check. |
| `POST /v1/auth/register` | None | JSON: `org_name` (2–120 chars), `org_slug` (3–40 lowercase letters/digits/hyphens; normalized lowercase), `email`, `display_name` (1–120 chars), `password` (10–72 UTF-8 bytes). | `201 {"token":"…","org_id":"…","role":"admin"}`. Creates a new organization and admin; `ai_disclosure_ack` remains false until separately acknowledged. Duplicate slug/email returns 409. |
| `POST /v1/auth/login` | None | JSON: `email`, `password` (1–72 chars), optional `org_slug`. | `200 {"token":"…","org_id":"…","role":"…"}`. If the user belongs to multiple organizations, `org_slug` selects the organization; otherwise the oldest membership is selected. Invalid credentials/membership use the same 401 message. |
| `GET /v1/me` | Any authenticated role | — | `200 {"user":{"id":"…","email":"…","display_name":"…"},"org":{"id":"…","name":"…","slug":"…","ai_disclosure_ack":false},"role":"…"}`. |

## Facts and version approvals

Fact categories: `statistic`, `pricing`, `certification`, `name`, `person`, `award`, `embargo`, `location`, `other`. Qualifiers: `exact`, `at_least`, `approx`.

| Method and path | Access | Request | Success |
|---|---|---|---|
| `GET /v1/facts` | All roles | — | `200` JSON array of flat fact/current-version rows. New facts awaiting first approval have no current-version fields until approved. |
| `GET /v1/facts/{fact_id}` | All roles | — | `200` flat fact/current-version object plus `versions` (all statuses) and `aliases`; 404 if not in caller's organization. Pending first versions are visible in `versions`. |
| `POST /v1/facts` | admin, brand_manager | JSON: `key` (2–80 lowercase letters/digits/underscore), `label` (2–200), `category`, `value_text` (1–2000), optional `value_number`, `value_unit` (≤80), `qualifier`, `source_ref` (≤500), `valid_from`, `expires_at`, `change_note` (≤2000). Dates must be ordered. | `201 {"fact_id":"…","version_id":"…","status":"pending_approval"}`. It does not become current until approved by a different user. |
| `POST /v1/facts/{fact_id}/versions` | admin, brand_manager | JSON: `value_text` (1–2000), optional `value_number`, `value_unit`, `qualifier`, `source_ref`, `valid_from`, `expires_at`, `change_note`. | `201 {"version_id":"…","version_no":2}`. Created directly as `pending_approval`; an approved current version remains active until approval. |
| `POST /v1/facts/{fact_id}/versions/{version_no}/submit` | admin, brand_manager | No body. Only a `draft` version can be submitted. | `200 {"status":"pending_approval"}`. |
| `POST /v1/facts/{fact_id}/versions/{version_no}/approve` | admin, approver | No body. Requires `draft` or `pending_approval`; proposer cannot approve their own proposal. | `200 {"status":"approved"}`. Makes this version current and supersedes the previous approved current version. |
| `POST /v1/facts/{fact_id}/versions/{version_no}/reject` | admin, approver | Optional JSON `{"reason":"…"}` (currently accepted but not persisted). Requires `draft` or `pending_approval`. | `200 {"status":"rejected"}`. |
| `GET /v1/facts/{fact_id}/versions/{version_no}/diff` | All roles | — | `200 {"version_no":2,"diff":{"value_text":{"before":"…","after":"…"}}}`. Compared fields: value text/number/unit, qualifier, expiry. Missing predecessor/version gives an empty or one-sided diff. |
| `POST /v1/facts/{fact_id}/blast-radius` | All roles | No body. Requires a current fact and a superseded predecessor. | `200` object containing `fact_id`, old/new values, `run_id`, `affected_count`, `affected[]`, `summary` (`confirmed`, `possible`, counts by registered state), and `scope_note`. With no predecessor returns an empty result and message. Only registered content is scanned; confirmed/possible labels use attribute match or exact claim span link vs value-only/mismatch. |
| `GET /v1/blast-radius/{fact_id}` | All roles | — | `200` latest persisted impact result for that tenant/fact, with run status/timestamps. If no scan exists, returns a message. |

## Rules and chaos testing

Rule categories: `tone`, `terminology`, `claims`, `accessibility`, `embargo`, `visual`, `other`. Severity: `low`, `medium`, `high`, `critical`.

| Method and path | Access | Request | Success |
|---|---|---|---|
| `GET /v1/rules` | All roles | — | `200` JSON array of flat rule/current-version rows. Newly created rules awaiting approval have no current-version fields until approved. |
| `GET /v1/rules/{rule_id}` | All roles | — | `200` flat rule/current-version object plus all `versions`; 404 if not in caller's organization. |
| `POST /v1/rules` | admin, brand_manager | JSON: `key` (2–80 alphanumeric/underscore/hyphen), `label` (2–200), `category`, `severity`, optional `applies_to` (≤20 strings, default `["all"]`), `description` (2–5000), optional `expected_behaviour`, `validation_criteria`, `change_note` (each ≤2000). | `201 {"rule_id":"…","version_id":"…","status":"pending_approval"}`. Rule becomes current only after another user approves it. |
| `POST /v1/rules/{rule_id}/versions` | admin, brand_manager | JSON: `description` (2–5000), optional `expected_behaviour`, `validation_criteria`, `change_note` (≤2000). | `201 {"version_id":"…","version_no":2}`; pending approval. |
| `POST /v1/rules/{rule_id}/versions/{version_no}/approve` | admin, approver | No body. Requires `draft` or `pending_approval`; proposer cannot approve their own proposal. | `200 {"status":"approved"}`; updates current version and supersedes the prior approved version. |
| `POST /v1/rules/{rule_id}/versions/{version_no}/reject` | admin, approver | Optional JSON `{"reason":"…"}` (currently accepted but not persisted). | `200 {"status":"rejected"}`. |
| `POST /v1/rules/{rule_id}/chaos-test` | admin, brand_manager | No body. Only approved tone rules are supported in Round 2. | `201` object: `run_id`, `rule_key`, `mode`, `n_interpreters` (=5), `cases_count` (=12 for tone), `ambiguous_count`, `cases[]`, `issues[]`; demo/mixed mode includes a truthful `demo_note`. Cases are balanced pass/fail/borderline, and model interpretations are distinct from deterministic fallback results. |
| `GET /v1/chaos-runs/{run_id}` | admin, brand_manager | — | `200 {"run":{…,"mode":"llm"|"demo"|"mixed"|"unknown"},"cases":[…],"issues":[…]}` including each case's human label and persisted interpretations/agreement. Mode is restored from the immutable run audit event; legacy rows without that event report `unknown` rather than guessing. |
| `POST /v1/chaos-cases/{case_id}/label` | admin, brand_manager | JSON: `{"human_label":"pass"|"fail"|"borderline"}`. | `200 {"case_id":"…","human_label":"…"}`. |
| `POST /v1/chaos-issues/{issue_id}/resolve` | admin, brand_manager | JSON: `{"status":"accepted"|"rejected"}`. | `200 {"issue_id":"…","status":"…"}`. Resolving an issue does not edit a rule. |

## Content

Channels: `web`, `social`, `email`, `press`, `pdf`, `image`. Request and extracted text limit is 1,000,000 characters; uploads are limited to 10,000,000 bytes. Upload extensions are `.txt`, `.pdf`, and `.docx`; extraction applies format/signature, page/archive, and size checks. Uploaded content is extracted and the client filename is stored only as bounded descriptive metadata; no user filename is used as a filesystem path or storage key.

| Method and path | Access | Request | Success |
|---|---|---|---|
| `GET /v1/content` | All roles | — | `200` JSON array of organization-wide content items with current version metadata. |
| `GET /v1/content/{item_id}` | All roles | — | `200` flat item/current-version object with `body_text`, `claims[]`, and findings across the item; 404 if not in caller's organization. |
| `POST /v1/content` | All roles | JSON: `title` (1–200), `channel`, `body_text` (required non-empty after trimming, ≤1 MB). | `201 {"content_item_id":"…","version_id":"…"}`. Stores a content hash and starts in draft. |
| `POST /v1/content/upload` | All roles | `multipart/form-data`: `title`, `channel`, `file`. | `201 {"content_item_id":"…","version_id":"…","extracted_length":123}`. Invalid type/content/empty extraction returns 422; oversize upload returns 413. |
| `POST /v1/content/{item_id}/analyse` | All roles | No body. Runs deterministic checks on the current version. | `200 {"run_id":"…","content_version_id":"…","findings_count":1,"findings":[…]}`. Analysis failure returns a generic 500 response; details are logged server-side. The item status is advanced only if the analyzed version is still current. |
| `POST /v1/content/{item_id}/versions` | All roles | JSON using content request fields; `body_text` is required. `title` and `channel` are accepted for wire compatibility but the existing item's title/channel are unchanged. | `201 {"item_id":"…","version_id":"…","version_no":2}`. Creates an append-only version and returns item to draft. |
| `POST /v1/content/{item_id}/redteam` | All roles | No body. Reviews the current version with three personas; persona findings are always possible, never a verdict. | `200 {"run_id":"…","mode":"llm"|"demo","findings":[…]}`. Fact/rule IDs are attached only when a model explicitly returns an exact repository key that is validated against approved records; text/label substring guessing is not used. Demo-only or provider-fallback results include `demo_note`. |

## Findings and human decisions

Decision actions: `accept`, `edit`, `dismiss`, `escalate`. Dismissal requires `reason_code` from `not_applicable`, `intended_meaning`, `rule_unclear`, `evidence_wrong`, `other`.

| Method and path | Access | Request | Success |
|---|---|---|---|
| `GET /v1/findings` | All roles | — | `200` organization-wide finding array, ordered by severity and creation time. |
| `GET /v1/findings/{finding_id}` | All roles | — | `200` finding object including `decisions[]` and optional persisted `debate` with its derived `mode`, no-verdict footer, and demo note when applicable; 404 if outside the organization. |
| `POST /v1/findings/{finding_id}/decide` | All roles | JSON: `action`; optional `reason_code`, `reason_text`, `final_text`. `reason_code` is required for dismiss. | `200 {"decision_id":"…","finding_status":"accepted"|"edited"|"dismissed"|"escalated"}`. This records a human decision; it does not publish content or apply `final_text` to the stored content version. |
| `POST /v1/findings/{finding_id}/debate` | All roles | No body. Finding severity must be `high` or `critical`, otherwise 422 `debate_unavailable`. | `200` with debate `id`, `finding_id`, `prosecutor_text`, `defender_text`, optional `minimal_edit`, `mode`, `cached`, and a no-verdict human-decision footer. Provider fallback returns a demo note. The debate is persisted; it does not decide the finding. |

## Implementation boundary

Round 2 currently has no generic document-upload API, generic content approval routes, passport issuance/verification routes, member-management routes, or public publishing route. Database tables that do not have API routes are not implied to be fully implemented. The API does not claim C2PA conformance.
