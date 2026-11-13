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

### Blast Radius comparison and coverage clarification

The scan now explicitly distinguishes a missing previous approved version from a completed scan. It considers exact old text as a possible match (including non-numeric facts), treats unchanged numeric values with different wording as possible rather than confirmed, uses human-confirmed links only, and scopes related queries to the tenant. An empty result does not establish that content is current: matching remains incomplete and the optional graph vector path is not integrated into historical Blast Radius scans. Previous versions are selected by approval time where available, with version number as a fallback. These changes do not generate embeddings or apply edits automatically.

### Debate evidence safety

Debate context queries now explicitly enforce tenant and approved-version scope, and deterministic finding citations preserve the original occurrence when a quote repeats. Passage references with a spurious version number are rejected. New and previously cached demo arguments render neutral review prompts rather than making unsupported legal, factual or intent claims; the stored cache is not rewritten. Finding citations are still not argument-level citations, and no conclusion or suggested edit is automatically validated.

### Embargo checker regression cases

Deterministic checker chaos now generates unique, reproducibly ordered tests for every active embargo term instead of just the first. A negative-control phrase is included only when it does not contain any active term. The test still checks the production checker's literal substring behavior only; it does not establish full embargo-rule coverage or detect synonyms and semantic references.

### Historical vector candidates in Blast Radius

When `GRAPH_VECTOR_MATCH_ENABLED=true`, the scan also compares current content-claim vectors with the selected superseded fact version's vector. Both vectors must have the same non-empty model, exact recorded inputs and a current, exact claim span within the same tenant. The top candidate per content item above the experimental 0.85 cosine threshold is exposed as **possible**, with model and similarity, and never replaces a deterministic match. This supersedes the earlier statement that graph-vector work was not connected to historical scans. It remains disabled by default, generates no embeddings and has not been calibrated. The added synthetic PostgreSQL test was skipped locally; the migration, SQL path, tenant isolation and end-to-end behavior still need database-backed CI before enabling. A similarity score is not a probability that content is stale.

### Hosted-provider spend safety

All existing hosted-model request entry points now fail closed, even if an API key or Red Team live flag is set. This supersedes earlier statements that a key alone or an opt-in flag enables live calls. Demo mode remains available and is labelled accordingly. This is a zero-call safety stop, **not** the requested configurable monetary cap: durable cross-worker reservation, price/version management, concurrency handling and accounting remain to be designed and independently verified before live calls can be re-enabled. Previously cached provider outputs can still be displayed, labelled by their existing mode. No provider calls were made in this work.

### Superseded numeric checker safety

The content checker no longer treats a numeric substring (for example `50,000` inside `150,000`) as a confirmed stale fact. It uses extracted exact numeric claims, attaches their spans, and labels candidates possible for human review because the number may refer to another attribute or pricing tier. It skips this numeric signal when the currently approved number is unchanged. This is not semantic stale-claim verification; database-backed end-to-end tests remain outstanding locally.

### Demo debate references

Neutral demo review prompts now each display the finding references that were revalidated for the current request. Cached demo prompts are reconstructed using current checked references; no references are invented when evidence is unavailable. The user interface explicitly states that a valid reference does not prove an interpretation. This is a deterministic cited-review foundation, not independent AI arguments or semantic validation of claims or edits; cached live-model arguments remain uncited and unverified.

### Human review sets across rule families

An approved rule from any category can now produce a persisted set from its own versioned examples and bounded case/whitespace transformations. Original labels are repository expectations, conflicting labels and transformed cases are explicitly unjudged, and a reviewer can save pass/fail/borderline labels. Runs with no examples are rejected rather than invented. No automatic verdicts or agreement scores are fabricated. The existing GET run endpoint retrieves saved cases; the UI currently creates and labels a run but does not offer a history browser. This is a human-review foundation, not full automated chaos or general regression testing. Pure/mocked tests passed; the added PostgreSQL persistence/isolation test was skipped locally.

### Review-set history

The rule-test page can list the most recent 20 human-review sets for a rule, identify their rule version and reopen saved human labels after refresh. The list and run reads explicitly scope records to the current tenant. This supersedes the prior note that the UI lacked a history browser. Unit/mocked tests and frontend build passed; the updated PostgreSQL isolation test remains skipped locally and requires DB-backed CI.

### Human-review regression snapshots

Reviewers can compare two saved human-review sets for the same rule and persist a point-in-time diff in the append-only audit log. Exact text identities track additions, removals, expectation/axis changes and human-label changes, including unlabelled cases. Results are tenant-scoped and can be fetched by comparison ID; later label changes do not alter the saved snapshot. This is a comparison of reviewer judgments, not automated checker performance or proof of correctness. Mocked/unit tests passed; PostgreSQL locking, persistence and isolation tests are skipped locally and require database-backed CI.

### Fact-to-channel graph path exploration

The graph UI can explore a fact's directed fact → claim → content → channel paths from the last rebuild. Each relationship retains its evidence method and Confirmed/Possible label; only recognised deterministic link/attribute edges can be confirmed. Similarity is always possible. This is a traversal of the current-fact snapshot, not a historical change scan or a guarantee that content is stale; channels are assignments rather than publication evidence. Reads take the same tenant-scoped advisory lock as rebuilds and are bounded. Unit/mocked API tests pass, while the added PostgreSQL isolation test is skipped locally. Embedding generation and calibration are still not implemented.

### Review-only cases for rules without examples

Human reviewers can now supply up to ten bounded examples when creating a review set for any approved rule, including rules with no saved examples. The inputs are persisted as unjudged review cases; they do not alter approved rule versions or rulebook examples, and no AI verdict is claimed. Original saved examples remain supported. The request was tested with a mocked HTTP API; the corresponding PostgreSQL persistence test remains skipped locally. This expands human review, not automated full-family chaos.

### Submission documentation refresh

Updated the QA report, README and About page to distinguish shipped foundations, uncalibrated/disabled vector paths, fail-closed hosted AI, and outstanding work. GitHub Actions metadata confirms run 43367031731 at `7855164e820ee89ee865a588f561a5b93c5d1fbf` passed PostgreSQL/pgvector migration, seed, backend tests, the no-skips guard and frontend build. The exact backend count could not be retrieved from logs here. Added a separate two-page evidence brief (Markdown source and PDF); it includes unmerged branch work and is not proof of deployment or independent QA. No current live-browser or backend-health check was performed.

### Merged-base CI and cached debate consistency

[CI run 43372979596](https://github.com/yashkatariya21/brandgaurd/actions/runs/43372979596) passed at base merge commit `b65f49bd394aa4122fb9abc69bd9da2b3a7f92df`: PostgreSQL/pgvector initialization, migrations, seed, backend tests, no-skips guard and frontend build passed. This does not verify current uncommitted changes or deployment. The finding-detail API now revalidates cached debate evidence and replaces unsafe legacy demo text with the same neutral prompts as the debate endpoint; fact/content/decision queries are explicitly tenant-scoped. Mocked tests pass; the added PostgreSQL isolation test is skipped locally.
