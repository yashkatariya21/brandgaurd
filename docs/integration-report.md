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
