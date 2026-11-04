# BrandGuard Round 2 Architecture

Status: Round 2 implementation reference. The working product is one FastAPI service and one PostgreSQL database; the frontend consumes the API contract in `docs/api-contract.md`.

## Runtime shape

- **API:** FastAPI under `backend/app`, with routers separated by auth, repository, content, findings, blast-radius, Red Team, and chaos-test flows.
- **Database:** PostgreSQL. SQL migrations live in `db/migrations`; `backend/app/migrate.py` applies them and re-applies grants.
- **Tenant context:** each request opens a transaction and sets transaction-local `app.org_id` and `app.user_id`. Pooled connections therefore do not retain tenant context across requests.
- **Tenant enforcement:** PostgreSQL row-level security is forced on tables carrying `org_id`; memberships use a separate policy so an authenticated user can resolve their own memberships. Application queries also constrain by tenant where an object ID is supplied.
- **Persistence:** facts and rules have immutable approved history through version tables; content versions are append-only; findings, human decisions, analysis runs, and audit events are stored in PostgreSQL.
- **Hosted AI:** optional OpenAI provider calls are made from the API service using the SDK declared in `backend/requirements.txt`, not a separate worker/service. `OPENAI_API_KEY` enables provider calls; `OPENAI_MODEL` selects the model and defaults to `gpt-4o-mini`. Provider errors are not represented as successful model output: the affected flow either uses a clearly labelled deterministic fallback or returns an error. No API key is required for demo mode.

## Core flow and human control

1. A creator registers content as text or a supported bounded upload (`.txt`, `.pdf`, `.docx`).
2. The content is versioned and hashed. The creator explicitly starts deterministic analysis or a separate Red Team review.
3. Findings remain open until a person records an accept, edit, dismiss, or escalate decision. A dismissal requires a reason.
4. Prosecutor/Defender is an optional paired argument for high- or critical-severity findings. It has no verdict and never records a human decision.
5. A new fact or rule and every subsequent fact/rule version start pending approval. A different user with an approval role must approve; a proposer cannot approve their own version. The current version pointer changes only on approval.
6. A fact's blast-radius scan reads registered content for the old value and persists its result in an impact `analysis_runs` row. Attribute-matched or exactly linked spans are confirmed; value-only or mismatched-attribute matches are possible. The scan does not inspect content outside BrandGuard.
7. Round 2 chaos testing is limited to approved tone rules. It generates twelve cases (four each pass/fail/borderline), evaluates five interpretations per case, and persists the generated labels/results. The human can label cases and resolve issues; suggestions do not modify rules.

No system action publishes content, auto-applies edits, or changes an approved fact/rule without a human approval. A generated suggestion is not an authoritative decision. Legal-persona outputs are risk perspectives, not legal advice. Demo-mode outputs are heuristics, not hosted-model results. The Product UI must disclose provider use to users.

## Data and access boundaries

`organisations` and `users` are global identity tables; organization-scoped business tables carry `org_id` and RLS. Membership role is re-read from the database for each authenticated request, so changed or removed membership claims in an old JWT do not preserve access. JWT signing secret, database URLs/passwords, and provider credentials are environment-provided; none belong in source control.

The application currently uses relational foreign keys and SQL joins. Round 2 blast radius is a tenant-scoped content scan, not a graph service or a graph database. It does not currently use a recursive CTE; introducing one is unnecessary for the implemented one-hop fact-to-content lookup. Vector storage is present in the initial schema but Round 2 retrieval uses structured approved fact/rule queries rather than vector search.

## Migrations and operational requirements

- Apply checked-in SQL migrations before starting the API; migration execution needs a database role allowed to create the schema objects, extension, and `brandguard_app` role.
- The runtime database URL must connect as the restricted `brandguard_app` role. Grants intentionally disallow updates/deletes to the audit log and content versions, and updates/deletes to fact/rule versions.
- Required environment: `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `APP_DB_PASSWORD`, and a `JWT_SECRET` of at least 32 characters. Optional: `JWT_TTL_MINUTES` (1–1440, default 60), `CORS_ORIGINS` (explicit comma-separated origins; wildcard is rejected), `OPENAI_API_KEY`, and `OPENAI_MODEL`.
- NimbusDesk seed users/data are fictional demo material. Reset is destructive and guarded by `ALLOW_RESET=1`; use only in a demo/test database.

## Round 2 boundaries and known limitations

- One synchronous API service and one PostgreSQL database; no queue, extra service, or autonomous publishing path.
- No vector retrieval, image OCR, signature/passport issuance, generic approval endpoint, or recursive dependency graph in Round 2.
- Deterministic claim/rule checks are a limited implemented slice, not a complete compliance/legal determination.
- Upload limits and extraction checks constrain application processing; deployment still needs request-body limits, TLS, database backups, and monitoring at its ingress/runtime boundary.
- `org_id` RLS protects tenant-scoped rows, but deployment and tests must connect as the non-owner runtime role so policies cannot be bypassed by a table owner or superuser.
