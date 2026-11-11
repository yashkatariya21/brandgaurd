# BrandGuard – AI Disclosure

## LLM provider

| Service | Provider | Model | Used for |
|---|---|---|---|
| Red Team (3 personas) | OpenAI | Configurable via `OPENAI_MODEL` (default: `gpt-4o-mini`) | Generating persona findings when `OPENAI_API_KEY` is set |
| Prosecutor vs Defender | OpenAI | Configurable via `OPENAI_MODEL` (default: `gpt-4o-mini`) | Generating debate arguments when the key is set |
| Chaos Test interpretation | OpenAI | Configurable via `OPENAI_MODEL` (default: `gpt-4o-mini`) | Five calls/interpretations of the configured model per case; these are not independent readers |
| Chaos case generation | OpenAI | Configurable via `OPENAI_MODEL` (default: `gpt-4o-mini`) | Generating balanced pass/fail/borderline test cases |

The LLM provider is **OpenAI**. The exact model is configurable via the `OPENAI_MODEL` environment variable (default: `gpt-4o-mini`).

## Data sent to the LLM

When `OPENAI_API_KEY` is set, submitted text and context are sent to OpenAI's API as required by the selected feature. This can include user-submitted content; do not submit data that you are not permitted to share with OpenAI.

- **Red Team:** Content item body text + a summary of approved facts (key: value, version, expiry) + a summary of approved rules (key, description, severity)
- **Debate:** The finding issue text + relevant content body text + related fact/rule context
- **Chaos Test interpretation:** Rule description text + case text
- **Chaos case generation:** Rule key, label, description, expected behaviour, severity

Avoid including personal data, credentials, or secrets in submitted content or context. Do not assume submitted text is fictional or safe to share.

## Demo-mode fallback

When `OPENAI_API_KEY` is **not set**, all AI features run in **demo mode**:

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
| OpenAI Python SDK | `openai>=1.30,<2` in `backend/requirements.txt` | Optional hosted-model integration used when `OPENAI_API_KEY` is configured |
| Secret guard | `backend/scripts/check_secrets.py` (AI-assisted project code) | Lightweight CI scan of tracked files for environment files and selected high-confidence credential patterns; not a full secret scanner or git-history scan |

The CI workflow contains fixed, non-production credentials solely for its disposable GitHub-hosted PostgreSQL service. No live credentials are required by the workflow. Deployment targets are not configured or deployed by this integration work.

## Integration work disclosure

The Docker Compose health checks, CI workflow updates, `.env.example` changes, and secret-guard script were prepared with Claude AI assistance during the confirmed build window and reviewed against the current repository sources. The CI workflow uses published GitHub-maintained Actions listed above; no third-party service was given private repository data by this work.

## Round 3 session — 2026-11-11

Round 2 code is pre-existing, submitted in Round 2. Round 3 changes in this session were AI-generated with Arena.ai Agent Mode and require human review. They use the existing project dependencies and fictional NimbusDesk seed data; no new dataset, live AI service, or external deployment was used. The frontend lockfile was regenerated against the existing package manifest. Local Python and Node test/build results and their limitations are recorded in `docs/integration-report.md`.

The Round 3 dependency-graph projection, local character-trigram matcher and graph UI were AI-generated with Arena.ai Agent Mode, using existing project libraries and fictional seed data. The local matcher is experimental and has not been calibrated or independently evaluated.

The Red Team grounding and stability helper functions, associated tests, and Competitor Watch changes were AI-generated with Arena.ai Agent Mode using existing dependencies. The helpers are not yet connected to the API; no live AI output or reliability metric was generated in this session.

The Red Team API grounding, stability, cache and presentation changes and migration 003 were AI-generated with Arena.ai Agent Mode. Tests used deterministic heuristic output and a fake database connection; no live provider call was made. Per-run monetary enforcement and validated debate citations remain unfinished.

Rulebook coverage, checker-chaos cases, tests and UI were AI-generated with Arena.ai Agent Mode, using existing libraries and fictional seed data. Coverage is heuristic; the separate deterministic checker test exercises only the two explicitly supported unchanged seed rules, not every family.

The CI no-skips gate, JUnit count reporter and added database API journey tests were AI-generated with Arena.ai Agent Mode. The linked GitHub Actions run used the project's existing PostgreSQL/pgvector service; no hosted product deployment or paid model call was performed.
