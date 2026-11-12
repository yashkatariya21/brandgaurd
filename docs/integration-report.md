# Integration report

Date: 2026-11-04
Scope: Round 2 integration and deployment preparation only. Round 3 was not started.

## Summary

The Round 2 code and integration setup have been updated. `docker compose config -q`, frontend build/lint, Python compilation, 18 database-independent backend tests, the targeted secret guard, and the 20-case blast-radius evaluation were run successfully. The production frontend dependency audit reports zero vulnerabilities.

**End-to-end release status: BLOCKED / NOT VERIFIED.** Docker Desktop's engine is unavailable in this environment, so no containers, database migrations, API journeys, or full database-backed test suite could be run. CI was not run, and `docs/QA-report.md` remains a placeholder; this report is not independent QA sign-off.

## Files changed

- `docker-compose.yml` — required environment checks, optional AI configuration, API health check, and health-based frontend dependency.
- `backend/Dockerfile` — predictable Python process/runtime environment variables.
- `.env.example` — safe placeholders and generation guidance; no real secret values intentionally added.
- `.gitignore` — excludes `.env` and `.env.*`, except the template `.env.example`.
- `.github/workflows/ci.yml` — secret guard, Python compilation, database-backed backend tests, evaluation, frontend ESLint and build.
- `backend/scripts/check_secrets.py` — lightweight guard against tracked environment files and selected high-confidence credential patterns.
- `docs/disclosure.md` — integration/build/CI dependency and AI-assistance disclosure.
- `docs/integration-report.md` — this report.

Frontend, backend, documentation, CI, and integration changes were coordinated across the session. No external deployment or destructive database operation was performed.

## Decisions made

1. Keep the existing single backend + PostgreSQL/pgvector + Vite frontend Compose topology; add readiness gates instead of adding services or redesigning the app.
2. Require `OWNER_DB_PASSWORD`, `APP_DB_PASSWORD`, `JWT_SECRET`, and `SEED_PASSWORD` for Compose startup. This fails fast rather than starting with blank or invalid values. The demo seed password must be at least 10 characters.
3. Keep OpenAI optional and demo-mode usable without an API key. Real keys remain environment-only.
4. Add a deliberately limited in-repository secret guard rather than claiming broad secret-scanning coverage. It checks the current tracked index, not prior git history and not all credential formats.
5. Keep the frontend Docker API URL configurable at build time for non-local hosting; the current local Compose image uses `http://localhost:8000`.
6. Do not deploy externally without human approval. No external deployment configuration has been exercised.

## API compatibility and integration findings

`docs/api-contract.md` now documents the backend routes. Source comparison against the frontend found the earlier issues corrected: fact submission and predecessor diff use the implemented routes, and rule approve/reject helpers use the corresponding backend endpoints. This is a source comparison, not a live API test.

| Area | Current source status | Remaining verification |
|---|---|---|
| Fact versions and approvals | UI submits drafts through `/submit`; API requires a distinct approver for activation. | Database-backed role flow not run. |
| Fact diff and rule decisions | Frontend paths/signatures align with the documented API routes. | Live API calls not run. |
| OpenAI mode | `openai>=1.30,<2` is declared; model selection uses `OPENAI_MODEL`; fallback states are represented as `demo`/`mixed`. | No live provider call or provider-outage integration test was run. |
| Frontend API base | Docker build sets `VITE_API_URL` for the local Compose topology. | Non-local hosting needs a build-time override and has not been deployed. |

## Commands/tests and exact actual results

| Command or check | Actual result |
|---|---|
| `docker compose config -q` | **Passed.** |
| Docker daemon / `docker compose up --build` | **Blocked.** `docker ps` could not connect to `dockerDesktopLinuxEngine`; the Docker Desktop service is stopped and could not be opened from this environment. No containers or database were started. |
| Frontend `npm run build` and `npm run lint` | **Passed** after upgrading to Vite 8 / React Router 7. |
| `npm audit --omit=dev` | **Passed:** zero production dependency vulnerabilities. Full `npm audit` still reports 15 moderate development-tool advisories in the ESLint/minimatch dependency tree. |
| `python -m compileall -q app tests scripts` | **Passed** using the available Python 3.9 interpreter. The project CI/container target Python 3.12. |
| Database-independent backend tests | **Passed:** 18 tests across extraction, LLM safety, request validation. |
| Full `pytest -q` / database-backed tests | **Not run:** Docker/PostgreSQL unavailable. A separate blast-radius test module also requires Python 3.10+ syntax; the local interpreter is 3.9. |
| `python -m scripts.evaluate` | **Passed:** on the 20-case fictional NimbusDesk set, precision 100%, recall 100%, false-positive rate 0%; real-world generalization is unmeasured. |
| `python -m scripts.check_secrets` | **Passed:** scanned 94 tracked files in the current index. This is not a history scan or a comprehensive secret scanner. |
| CI and hosted-model calls | **Not run.** No CI run or external OpenAI request was made. |

## Blockers

- Docker engine is unavailable; container startup, migrations, live API workflows, and DB/RLS tests remain unverified.
- The full backend test suite and CI were not run.
- Full `npm audit` still reports 15 moderate development-tool advisories; production dependencies are clean.
- Non-local deployment needs a `VITE_API_URL` build-time override and has not been configured or approved.
- Backend dependency requirements use version ranges rather than a fully resolved lockfile, and container image tags are not digest-pinned. The build is configured for reproducible setup, but bit-for-bit reproducible dependency/image resolution is not established.
- QA sign-off is unavailable: `docs/QA-report.md` says “not started.”
- Vercel/Render/Railway deployment has not been configured or approved. Frontend runtime API URL configuration needs UI-owner work before a non-local frontend deployment.

## Status per item

| Item | Status | Evidence |
|---|---|---|
| Compose configuration | **Done** | `docker compose config -q` passed. |
| Container build and full-stack startup | **Blocked / untested** | Docker daemon unavailable. |
| Frontend build and lint | **Done** | Both local commands passed. |
| Backend compilation and selected unit tests | **Partial** | Compilation and 18 DB-independent tests passed; full suite not run. |
| Evaluation | **Done, limited** | Measured only on the fictional 20-case dataset; not evidence of real-world performance. |
| Production dependency audit | **Done** | `npm audit --omit=dev` reported zero vulnerabilities; 15 moderate dev-tool advisories remain in full audit. |
| Independent QA and release readiness | **Not ready** | `docs/QA-report.md` remains “not started”; database-backed verification is unavailable. |

## Round 3 work session — 2026-11-11

- Docker executable, local PostgreSQL, and Python 3.12 were not available in this workspace. `docker compose up --build` failed (`docker: command not found`); migration `002_round3_foundations.sql`, graph RLS and database-backed tests have **not** been executed here.
- Created a local Python 3.11 virtual environment and installed `backend/requirements.txt`. `cd backend && ../.venv/bin/python -m pytest -q`: **79 passed, 37 skipped, 1 warning**. Skips reflect missing database configuration, so this is not full-suite verification.
- With dummy DB environment strings, the DB-independent modules `tests/test_llm_safety.py tests/test_request_validation.py` ran: **13 passed, 1 warning**. This does not verify database access or a live AI provider.
- After lockfile synchronization, `cd frontend && npm ci`, `npm run lint`, and `npm run build` passed on Node 22.22.3. npm reported 6 moderate vulnerabilities; no audit remediation was attempted.
- Latest accessible main-branch GitHub Actions run 42478171548 reports backend job success and frontend job failure at `npm ci`; detailed logs could not be retrieved. There is no CI run for this work branch. Do not treat the older backend result as validation of migration 002 or this branch.
- No hosted deployment, live-model call, browser end-to-end test, independent QA, or release verification was performed.

### Remaining critical work

The three Round 3 commitments are **partial**, not complete: graph schema is present but not populated or exposed; semantic matching and embeddings are not implemented; rule conflict candidates are exposed but full-family testing, resolution and regression are not complete; Red Team grounding, stability, competitor persona and cited debates are not implemented. Migration and rejection persistence need DB-backed testing. Session storage and the demo-flow changes need browser verification. Deployment and spending remain gated.

### Dependency graph progress (next session)

Graph rebuild and read endpoints now derive a graph from current approved facts, registered content versions and extracted claim spans, and refresh it when content is analysed or a fact is approved. The UI has a graph, filters, a text list and evidence details. Exact numeric/attribute and confirmed links may be confirmed; character-similarity-only edges are possible. Channel edges mean assigned channel, not proof of publication. Local similarity is experimental and uncalibrated. Hosted embeddings, paraphrase-set calibration, urgency ranking, and what-if previews are not implemented.

`cd backend && ../.venv/bin/python -m pytest -q` on Python 3.11: **82 passed, 38 skipped, 1 warning**; the new DB-backed idempotency/RLS test is among the skips. Frontend lint and build passed on Node 22.22.3. No database, CI, browser or deployed verification was performed. The graph APIs, migration and automatic refresh hooks must be tested against PostgreSQL with pgvector before release.

### Red Team progress (2026-11-11)

Added Competitor Watch to the existing single-run Red Team and corrected a product-name heuristic that could flag the approved spelling. Added pure citation-validation and stability-clustering helpers with unit tests. **These helpers are not yet connected to the API or persistence**: the existing Red Team still exposes single-run findings without enforced citations or stability filtering. The UI explicitly warns about that limitation; this is not completion of Evidence-grounded Red Team. Existing heuristic outputs are not legal advice.

`cd backend && ../.venv/bin/python -m pytest -q`: **88 passed, 38 skipped, 1 warning**. `cd frontend && npm run lint && npm run build`: both passed on Node 22.22.3. No DB-backed, browser, live-model or CI verification was performed.

### Evidence-grounded Red Team integration (2026-11-11)

Added migration 003 and connected citation validation, repeated runs (default three, max five), stable/unstable clustering, ungrounded drop storage, tenant-scoped caching and run metrics to the Red Team API. Legacy persona findings without validated evidence are hidden by default. The UI displays validated quotes, possible labels, stability and a collapsed unstable list. Demo repetitions are deterministic and explicitly not measured reliability. Live Red Team requires both `OPENAI_API_KEY` and `REDTEAM_LIVE_ENABLED=true`; it has input and call-count bounds but **no enforced monetary cap**. Do not enable it until an approved spend limit and enforcement are established.

Tests: backend `pytest -q` **91 passed, 38 skipped, 1 warning** before the additional database-only cache test; the API orchestration tests use a fake connection and do not verify PostgreSQL. Frontend lint and build passed. Migration 003, SQL persistence, DB-backed cache/isolation and all live-provider calls remain unverified. Debates still lack validated citations, and evidence links/highlights and independent QA are incomplete. This is not release-ready.

### Rulebook health and checker chaos (2026-11-11)

Added a tenant-scoped rulebook coverage endpoint and text-table UI. It uses simple keyword and channel-scope heuristics to propose gaps; it is not proof of coverage. Added separate deterministic checker chaos for the **unchanged seeded** R-04 product-name and R-12 embargo rules. It shares predicates with the production checker, persists constructed cases and observed outcomes, and labels clear checker misses separately from judgement-based agreement. In the locally run fixture, the current checker misses the explicitly banned short form `Nimbus` and the double-space spelling `Nimbus  Desk`; these remain known limitations, not fixed. Hyphen and zero-width variants remain borderline, not confirmed violations.

Other rule families, contradiction resolutions, regression, accessibility checker chaos and full CI/DB testing remain unfinished. `cd backend && ../.venv/bin/python -m pytest -q`: 95 passed, 39 skipped, 1 warning before adding an extra DB-only persistence test. Frontend lint and build passed on Node 22.22.3. The new endpoint and its persistence have not been exercised against a database or in a browser.

### Round 3 continuation — 2026-11-12

The content upload UI now supports PDF, DOCX and UTF-8 TXT with file size validation, channel selection and visible success/error states; content and blast-radius pages no longer silently substitute sample lists on API failure. Multipart router tests exercise TXT and DOCX extraction, unsupported types and upload-size handling with mocked persistence, not a real database or browser. The two known seeded product-name checker misses (`Nimbus` and `Nimbus  Desk`) were addressed for the explicit deterministic extractor; hyphen and zero-width examples remain borderline. These are not evidence of full guideline-family coverage or end-to-end checker calibration.

Local Python 3.11 backend suite: **100 passed, 40 skipped** (database-dependent tests skipped), one dependency warning. Frontend lint and production build passed before this continuation. No live provider, deployed upload, independent QA or browser workflow was verified. Semantic embedding generation/calibration, full rule-family chaos and persisted regression/contradiction resolutions, validated debate citations, and enforced provider monetary caps remain incomplete. Do not enable live AI until spending can be bounded and independently verified.

### Contradiction decisions continuation

Possible rule conflicts now expose human accept/reject controls. Decisions are audited and stored against the exact pair of current approved rule versions using existing chaos tables; a later rule version needs a fresh decision. The endpoint rechecks the candidate and tenant context and uses an advisory lock to serialize decisions for a pair. This does not make heuristic conflicts confirmed automatically, implement general contradiction detection, or supply regression diffs.

Local verification: backend **101 passed, 41 skipped** (including the new PostgreSQL persistence and isolation test), one warning; the conflict orchestration test uses a fake database. Frontend lint and build passed. PostgreSQL, deployed and browser behavior remain unverified in this workspace.

### Checker regression continuation

The supported deterministic checker-chaos runs now compare added, removed and changed case labels with the previous saved run for the same rule. Previous-run identity is stored in the existing audit record; the comparison can be reconstructed from persisted case and result rows. This remains limited to the two supported seeded checks and is not full rule-family regression coverage. Also corrected the chaos run retrieval query to order issues by an existing column.

Local Python 3.11 suite: **103 passed, 41 skipped**, one warning; database-backed run-history and tenant-isolation tests were skipped. Frontend lint/build passed. No database migration or live AI call was made.

### Debate evidence continuation

The debate endpoint now revalidates a finding's recorded passage and versioned fact/rule references against tenant-scoped records and displays valid evidence, omitting invalid citations with a count. Deterministic findings may show an exact valid passage span. These sources belong to the finding; debate arguments and suggested edits remain unvalidated, including legacy cached debates. This does not complete argument-level citation validation or the required live-provider monetary cap.

Local Python 3.11 suite: **106 passed, 41 skipped**, one warning. New evidence tests are pure-function tests; tenant-scoped SQL, PostgreSQL, browser and live-provider behavior are not verified locally. No external provider calls were made.

### Experimental graph similarity evaluation and CI guard

Added a reproducible report for the existing local character-similarity threshold on 20 AI-generated same-fact/value pairs. At the existing 0.55 threshold, the 10 development cases produced 5 true positives, 3 false positives, 2 true negatives and 0 false negatives; the 10 holdout cases produced 3 true positives, 2 false positives, 3 true negatives and 2 false negatives. Both splits were created together by AI and require independent label review. These results do not calibrate a semantic embedding model or represent real-world performance. In particular, similar text with a different value can score highly. The threshold was not changed.

Existing vector columns lack model/version provenance; connecting arbitrary stored vectors could compare incompatible embedding spaces, so no pgvector retrieval was enabled. Embedding generation, provenance, semantic retrieval and independent calibration remain unfinished. No provider calls were made. Restored a CI JUnit guard that rejects skipped or failed database tests; its next GitHub run is not yet verified.

Local Python 3.11: **110 passed, 41 skipped**, one warning. The skipped tests require PostgreSQL and are not independent QA.

### Optional pgvector matching foundation

Migration 004 adds model and exact-input provenance to the existing vector columns. The graph rebuild can compare same-tenant, current fact and claim vectors via pgvector cosine distance only when `GRAPH_VECTOR_MATCH_ENABLED=true`; it ignores missing/stale provenance, mismatched models and stale claim spans. Top-three matches above the experimental 0.85 threshold are labelled **possible**, never confirmed, and include the model identifier. Existing unlabelled vectors are ignored. This path is disabled by default, does not generate vectors, and is not yet calibrated. The exact expected fact input is `label + newline + value_text`; claim input is its exact raw text. No hosted embedding calls were made or enabled.

Synthetic-vector Postgres integration tests were added for model mismatch, stale input and tenant isolation. Locally **112 passed, 42 skipped**, including the new Postgres test; migration 004 and pgvector queries have not been run here and need database-backed CI and independent review before enabling. Semantic embedding generation and representative calibration remain unfinished.
