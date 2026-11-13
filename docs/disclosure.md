# BrandGuard – AI Disclosure

## LLM provider

| Service | Provider | Model | Used for |
|---|---|---|---|
| Red Team (3 personas) | OpenAI | Configurable via `OPENAI_MODEL` (default: `gpt-4o-mini`) | Intended hosted persona findings; currently disabled |
| Prosecutor vs Defender | OpenAI | Configurable via `OPENAI_MODEL` (default: `gpt-4o-mini`) | Intended hosted debate arguments; currently disabled |
| Chaos Test interpretation | OpenAI | Configurable via `OPENAI_MODEL` (default: `gpt-4o-mini`) | Intended hosted interpretations; currently disabled |
| Chaos case generation | OpenAI | Configurable via `OPENAI_MODEL` (default: `gpt-4o-mini`) | Intended hosted case generation; currently disabled |

The LLM provider is **OpenAI**. The exact model is configurable via the `OPENAI_MODEL` environment variable (default: `gpt-4o-mini`).

## Data sent to the LLM

Hosted calls are currently disabled even if an API key is set: no durable monetary cap has been implemented. If a future implementation enables hosted calls, submitted text and context could include user content and must be handled under an approved data-sharing policy.

- **Red Team:** Content item body text + a summary of approved facts (key: value, version, expiry) + a summary of approved rules (key, description, severity)
- **Debate:** The finding issue text + relevant content body text + related fact/rule context
- **Chaos Test interpretation:** Rule description text + case text
- **Chaos case generation:** Rule key, label, description, expected behaviour, severity

Avoid including personal data, credentials, or secrets in submitted content or context. Do not assume submitted text is fictional or safe to share.

## Demo-mode fallback

Hosted AI calls are disabled; supported fallback features run in **demo mode**:

- **Red Team:** Deterministic heuristic stubs (regex-based checks for known patterns in the NimbusDesk seed data)
- **Debate:** Pre-written stub prosecutor/defender texts
- **Chaos Test:** Lightweight rule-based interpreter (5 heuristics: exclamation count, emoji, ALL-CAPS ratio, slang, contractions) + pre-written balanced case sets

All demo-mode responses include `"mode": "demo"` in the API response and a "Demo mode (no AI key)" badge in the UI. Demo results are clearly heuristic and not presented as AI output.

## Pre-prepared components

The following were prepared before the hackathon build window:

- The NimbusDesk fictional evaluation pack (seed data, content assets A-01..A-12, fact and rule definitions)
- The agent team configuration (`.claude/agents/`)
- The CLAUDE.md orchestrator rules

## AI-generated code

Portions of this codebase were generated with AI assistance (Claude) during the hackathon build window. All generated code has been reviewed and is disclosed in `docs/decisions.md`.

## What BrandGuard does NOT do

- It does not provide legal advice. Legal Eagle findings carry the note "AI risk perspective, not legal advice."
- It does not publish or auto-apply corrections. A human must decide on every finding.
- It does not claim C2PA compliance. Content passport signatures (Round 3) prove integrity and key identity, not truth.
- It does not claim any specific accuracy numbers. The `scripts/evaluate.py` script measures and prints real numbers on the fictional labelled dataset.

## Integration, build, and CI components

The following tools and dependencies are used by the integration/build setup. Exact application dependency ranges are recorded in `backend/requirements.txt` and `frontend/package.json`; the frontend install in CI uses the checked-in npm lockfile.

| Component | Source / version | Use |
|---|---|---|
| Docker Compose | Docker Compose v2 plugin | Local orchestration of the database, API, and frontend |
| PostgreSQL image | `pgvector/pgvector:pg16` | PostgreSQL 16 plus pgvector extension for local and CI databases |
| Backend base image | `python:3.12-slim` | Backend container runtime |
| Frontend base image | `node:20-alpine` | Existing frontend build/runtime container (maintained by UI owner) |
| GitHub Actions | `actions/checkout@v4`, `actions/setup-python@v5`, `actions/setup-node@v4` | CI checkout and Python/Node toolchain setup |
| Backend libraries | FastAPI, Uvicorn, psycopg, bcrypt, PyJWT, Pydantic, pytest, HTTPX, python-docx, pypdf, python-multipart; versions/ranges in `backend/requirements.txt` | API, database access, authentication, extraction, and tests |
| Frontend libraries | React, React DOM, React Router, Vite, TypeScript, ESLint, Tailwind CSS and listed plugins; versions in `frontend/package.json` / lockfile | Existing web UI, build, and lint |
| Static frontend server | `serve` installed globally in the existing frontend Dockerfile (version not pinned) | Serves the Vite production bundle |
| OpenAI Python SDK | `openai>=1.30,<2` in `backend/requirements.txt` | Optional hosted-model integration, currently fail-closed even if a key is configured |
| Secret guard | `backend/scripts/check_secrets.py` (AI-assisted project code) | Lightweight CI scan of tracked files for environment files and selected high-confidence credential patterns; not a full secret scanner or git-history scan |

The CI workflow contains fixed, non-production credentials solely for its disposable GitHub-hosted PostgreSQL service. No live credentials are required by the workflow. Deployment targets are not configured or deployed by this integration work.

## Integration work disclosure

The Docker Compose health checks, CI workflow updates, `.env.example` changes, and secret-guard script were prepared with Claude AI assistance during the confirmed build window and reviewed against the current repository sources. The CI workflow uses published GitHub-maintained Actions listed above; no third-party service was given private repository data by this work.

## Round 3 session — 2026-11-11

Round 2 code is pre-existing, submitted in Round 2. Round 3 changes in this session were AI-generated with Arena.ai Agent Mode and require human review. They use the existing project dependencies and fictional NimbusDesk seed data; no new dataset, live AI service, or external deployment was used. The frontend lockfile was regenerated against the existing package manifest. Local Python and Node test/build results and their limitations are recorded in `docs/integration-report.md`.

The Round 3 dependency-graph projection, local character-trigram matcher and graph UI were AI-generated with Arena.ai Agent Mode, using existing project libraries and fictional seed data. The local matcher is experimental; the synthetic unreviewed calibration described below is not independent validation.

The Red Team grounding and stability helper functions, associated tests, and Competitor Watch changes were AI-generated with Arena.ai Agent Mode using existing dependencies. The helpers are not yet connected to the API; no live AI output or reliability metric was generated in this session.

The Red Team API grounding, stability, cache and presentation changes and migration 003 were AI-generated with Arena.ai Agent Mode. Tests used deterministic heuristic output and a fake database connection; no live provider call was made. Per-run monetary enforcement and validated debate citations remain unfinished.

Rulebook coverage, checker-chaos cases, tests and UI were AI-generated with Arena.ai Agent Mode, using existing libraries and fictional seed data. Coverage is heuristic; the separate deterministic checker test exercises only the two explicitly supported unchanged seed rules, not every family.

The homepage redesign, shared brand mark and favicon, and related sign-in and footer copy changes were AI-generated with Arena.ai Agent Mode using the existing React, Tailwind and Lucide dependencies. The workflow illustration is illustrative, not live workspace data.

The redesigned login page and authentication error-handling changes were AI-generated with Arena.ai Agent Mode using existing project dependencies. No authentication bypass or external service was added.

The previously AI-generated login redesign and real-backend authentication flow were restored after the merge; missing frontend API types and methods were also restored using the prior project revision. Mobile navigation received accessible labels. These changes use existing dependencies and were prepared with Arena.ai Agent Mode.

The editorial UI refresh and fictional Indian persona labels were AI-generated using Arena.ai Agent Mode, informed by the public nomonkey.work and renoenergie.ca pages. Existing Lucide icons and project dependencies were used; no reference-site assets were copied. Persona names are illustrative labels for the existing seeded role accounts, not new backend identities. Demo login still requires matching seeded backend credentials.

The shared workspace navigation, breadcrumb and demo role-switch experience were refreshed with Arena.ai Agent Mode using existing frontend dependencies. Role switching still uses backend authentication; no new accounts or backend changes were added.

The content upload interface, API error-state improvements and multipart upload tests were AI-generated using Arena.ai Agent Mode with existing dependencies. Tests use a mocked persistence function and do not establish deployed upload or browser behavior.

The seeded product-name extractor and checker-chaos regression updates were AI-generated with Arena.ai Agent Mode, using existing project dependencies and tests. No live model call or paid API was used.

The rule-conflict decision endpoint, interface and tests were AI-generated with Arena.ai Agent Mode using existing chaos tables and project dependencies. Database integration tests have not been run locally.

The checker regression comparison, API/UI wiring, and tests were AI-generated with Arena.ai Agent Mode, using existing dependencies and saved chaos/audit tables. Database-backed verification is pending.

Debate finding-evidence retrieval, revalidation and UI were AI-generated with Arena.ai Agent Mode, using existing dependencies. Revalidated sources are evidence attached to the finding, not verified citations for each argument; no live provider call was made.

The synthetic graph similarity examples in `backend/tests/data/graph_similarity_cases.json` and the evaluation/CI scripts were AI-generated with Arena.ai Agent Mode for this project. They are fictional, not independently labelled or representative. Both splits were created together; the holdout is not an independent benchmark. No external dataset, embedding model or paid API was used.

The optional pgvector graph matching foundation, provenance migration and synthetic-vector tests were AI-generated with Arena.ai Agent Mode, using the project's existing pgvector/PostgreSQL dependencies. Vectors in the test are synthetic fixtures, not model outputs. No embedding model, external dataset or paid provider was used.

The Blast Radius prerequisite/empty-state correction and its mocked API test were AI-generated with Arena.ai Agent Mode using existing project dependencies. No live workspace data or credentials were accessed.

The Blast Radius exact-text candidate matching, tenant query tightening, qualifier handling and accompanying synthetic unit tests were AI-generated with Arena.ai Agent Mode using existing dependencies. No external dataset or provider was used.

The debate demo-safety revision, citation offset checks and associated synthetic tests were AI-generated with Arena.ai Agent Mode using existing dependencies. The generated demo prompts are not legal advice or evidence of compliance.

The multi-term embargo checker-chaos generator and its synthetic unit tests were AI-generated with Arena.ai Agent Mode using existing project dependencies.

Historical Blast Radius vector retrieval, UI labelling and synthetic tests were AI-generated with Arena.ai Agent Mode using the existing PostgreSQL/pgvector dependency. No embedding provider or external data was used; synthetic vectors do not measure semantic quality.

The fail-closed hosted-provider safety guard and synthetic tests were AI-generated with Arena.ai Agent Mode using existing dependencies. The guard is not a monetary accounting system.

The superseded numeric checker safety change and synthetic tests were AI-generated with Arena.ai Agent Mode using existing claim extraction dependencies.

The proposal-to-repository verification matrix and the removal of fictional frontend fallbacks on Dashboard, Repository, Findings and Rule Tests were AI-generated with Arena.ai Agent Mode. The user-provided proposal was read with the project's existing pypdf dependency. This review is not independent QA.

The deterministic debate reference display and synthetic tests were AI-generated with Arena.ai Agent Mode using existing dependencies. Valid references do not establish the correctness of the prompts or a legal conclusion.

The rule-family human-review case generator, API, UI and tests were AI-generated with Arena.ai Agent Mode using existing project dependencies and user-entered rule examples. Transformations are not AI interpretations or verified rule outcomes.

The tenant-scoped human-review history endpoint, UI and tests were AI-generated with Arena.ai Agent Mode using existing project dependencies.

The human-review regression comparison API, UI, persistence and synthetic tests were AI-generated with Arena.ai Agent Mode using existing PostgreSQL and project dependencies. Human labels are judgments, not ground truth or accuracy metrics.

The graph path traversal, API, UI and synthetic tests were AI-generated with Arena.ai Agent Mode using existing project dependencies. Graph relationships are snapshot-derived and do not establish factual truth or stale content.

Review-only case entry, validation, API/UI integration and synthetic tests were AI-generated with Arena.ai Agent Mode using existing dependencies. Inputs are human-supplied and are not verified truth or approved rule edits.

The QA report refresh, README/About corrections, submission evidence brief and supplemental PDF were AI-generated with Arena.ai Agent Mode, with project lead review required. The PDF was generated using ReportLab and pypdf (Python libraries) and system DejaVu Sans fonts; it is a separate supplement, not an independently verified original proposal. GitHub Actions metadata was accessed with GitHub CLI; current deployment and independent QA were not verified. No model or external dataset was used at runtime.

The finding-detail debate consistency fix, synthetic tests and refreshed CI evidence were AI-generated with Arena.ai Agent Mode using existing dependencies. GitHub Actions metadata was retrieved using GitHub CLI. The supplemental PDF was regenerated from its Markdown source using the disclosed ReportLab and pypdf tools; it is not independent QA.


The bounded offline lexical candidate matcher, its integration and synthetic tests were AI-generated with Arena.ai Agent Mode using Python's standard library. Its small handwritten synonym list is not an embedding model, a calibrated semantic-retrieval system or proof of stale content. No external dataset or model is used at runtime.

The guarded draft-deletion migration, API, UI and synthetic tests were AI-generated with Arena.ai Agent Mode using the existing PostgreSQL and project dependencies. Deletion is restricted to admins and brand managers and preserves audit records; prior audit entries and historical snapshots can still contain references. Database-backed validation and deployment are required before relying on these controls.

The 150-case synthetic graph fixture, standard-library normalization, calibration script, Blast Radius scope changes, and checker coverage documentation were AI-generated with Arena.ai Agent Mode using existing dependencies and fictional examples. Labels are unreviewed and require human review. The holdout was observed before three overlapping examples were replaced, so it is not pristine. No external provider calls were made during development.

The polarity- and channel-aware rule-conflict heuristic and its tests were AI-generated with Arena.ai Agent Mode using Python's standard library. It recognises a narrow set of imperative phrases; candidates require human interpretation and the heuristic is not exhaustive.

The rulebook fault fixture, evaluation script and predicate tests were AI-generated with Arena.ai Agent Mode. Its product-name and embargo examples and labels are synthetic, unreviewed and require human review. They were developed alongside the detector and are not an independent benchmark. Evaluation exercises shared production predicates, not the database-backed checker end to end; other rule families are not measured.

The family capability inventory and Rule Tests display were AI-generated with Arena.ai Agent Mode using existing project dependencies. They describe implemented checker and test paths, not individual-rule coverage or compliance.

The cached-debate presentation safety change and tests were AI-generated with Arena.ai Agent Mode. Legacy stored arguments without validated per-argument citations are replaced in responses by neutral deterministic prompts; the original stored history is not modified. Hosted debate remains disabled, and argument citation validation for a future live mode remains unfinished.

The synthetic Red Team demo fixture, evaluation script and tests were AI-generated with Arena.ai Agent Mode using existing project dependencies. Labels are unreviewed and require human review; scenarios were developed with knowledge of the implementation. The evaluation runs the real deterministic persona and grounding functions, not a database or hosted model, and measures a narrow target-persona signal rather than finding correctness or real-world accuracy.

The saved Red Team demo evaluation endpoint and presentation were AI-generated with Arena.ai Agent Mode using existing dependencies. The report is a static synthetic snapshot, not tenant data or live monitoring, and may become stale after code changes.

The experimental argument-pair validation helper and tests were AI-generated with Arena.ai Agent Mode using Python's standard library. It is not yet connected to live debate; it checks citations and literal digit figures only, not written-out numbers, entailment or semantic correctness. Hosted calls remain disabled and no provider was contacted.
