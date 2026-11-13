# BrandGuard

Brand governance prototype for reviewing registered content against approved facts and rules. It surfaces possible stale statistics, naming and embargo issues for human decisions; it does not publish content automatically. Three focus areas: **Brand-as-Code with Blast-Radius Intelligence**, **Adversarial Brand Red Team**, and **Guideline Chaos Testing**. Hosted AI calls are currently disabled pending spend-cap enforcement.

Built for the **Inkloom AI Hackathon 2026**.

---

## What it does and current limits

### Brand-as-Code with Blast-Radius Intelligence
Facts have versions, approvals, validity dates and separation of duties. A historical scan compares the previous approved value with current versions of content registered in the workspace. It cannot scan the public web or guarantee every paraphrase is found. If there is no previous version, no comparison is performed.

Matches are **Confirmed** only for specific deterministic value-and-attribute or human-confirmed-link matches; a **Possible** match needs human review. A label is not proof of factual truth or legal compliance. The dependency graph shows fact → claim → content → channel relationships in its last rebuilt snapshot, not proof of publication or historical impact. Nothing is changed automatically.

The local character-similarity matcher is experimental and uncalibrated. An optional pgvector path is disabled by default and requires compatible, provenance-labelled vectors; it never generates embeddings and labels its matches Possible. Vector search over uploaded documents and representative calibration remain unfinished.

### Adversarial Brand Red Team
Four perspectives — **Brand Police**, **Legal Eagle**, **Customer Voice** and **Competitor Watch** — raise Possible findings. The service validates cited passages and versioned fact/rule references against tenant-scoped records, groups repeated findings and hides unstable findings by default. Repetition of deterministic demo heuristics is not measured reliability. Legal Eagle is not legal advice.

A Prosecutor/Defender panel presents review prompts and validated finding references; a person decides. Demo prompts are not substantive AI arguments, cached provider arguments are not validated, and an evidence reference does not prove a conclusion or suggested edit.

### Guideline Chaos Testing
Tone-rule demo tests use heuristic interpretations; agreement measures consistency, not correctness. Rulebook coverage and contradiction candidates require human decisions. Reviewers can build and label persisted review sets for any rule family from saved examples or review-only inputs, and compare saved sets. Checker-specific tests and regression diffs currently cover only the unchanged seeded product-name and embargo checks. Full automated testing across all rule families remains unfinished.

### Content and decisions
Paste or upload TXT, PDF or DOCX for bounded extraction and registered-content checks. Extraction and deterministic rules are incomplete; not every claim is identified or every deterministic finding necessarily confirmed. Human reviewers can accept, edit, dismiss with a reason, or escalate. No content is published or edited automatically.

## AI and spend safety

**Hosted-model calls are currently disabled**, even when `OPENAI_API_KEY` or a live feature flag is set. The app uses clearly labelled deterministic demo heuristics and neutral review prompts. This is a zero-call safety stop while a durable monetary cap is unfinished; it is not an enforced configurable budget. Previously cached model output, if any, can still be displayed with its mode. No current live-AI rehearsal is claimed.

## Verification

A [database-backed GitHub Actions run](https://github.com/yashkatariya21/brandgaurd/actions/runs/43372979596) passed at commit `b65f49bd394aa4122fb9abc69bd9da2b3a7f92df`. Its backend job used PostgreSQL/pgvector, applied migrations and seed data, ran tests, and passed the no-skips JUnit guard; its frontend lint/build passed. This is evidence for that commit, not for later changes or a deployed site. Current-branch local checks and their database skips are recorded in [QA report](docs/QA-report.md). Independent QA, current database-backed CI and a full live-browser walkthrough remain pending.

---

## Quick start (Docker)

```bash
cp .env.example .env
# Edit .env — set OWNER_DB_PASSWORD, APP_DB_PASSWORD, JWT_SECRET, SEED_PASSWORD
# Hosted AI calls are currently disabled until spend-cap enforcement exists

docker compose up --build
```

The seed script auto-loads the **NimbusDesk** demo workspace on first start.

Open http://localhost:3000 and sign in. With `VITE_DEMO_MODE=true` (the default in docker compose), the login page shows a **"Try the demo"** section with role buttons. Click **Start demo** to sign in as Brand Manager, or pick any role.

| Role | Email | Password |
|---|---|---|
| Admin | admin@nimbusdesk.example | `$SEED_PASSWORD` |
| Brand Manager | brand@nimbusdesk.example | `$SEED_PASSWORD` |
| Approver | approver@nimbusdesk.example | `$SEED_PASSWORD` |
| Manager | manager@nimbusdesk.example | `$SEED_PASSWORD` |
| Content Creator | creator@nimbusdesk.example | `$SEED_PASSWORD` |
| External Agency | agency@nimbusdesk.example | `$SEED_PASSWORD` |

To switch roles mid-session (e.g. Brand Manager proposes → Approver approves in the same browser), use the **Switch role** dropdown in the top navigation bar. No separate browser profile is needed.

---

## Local dev (without Docker)

### Backend

Use Python 3.12 (the same version used by the backend container and CI).

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt

# Set env vars (copy from .env.example)
set DATABASE_URL=postgresql://brandguard_app:...@localhost:5432/brandguard
set MIGRATION_DATABASE_URL=postgresql://brandguard_owner:...@localhost:5432/brandguard
set APP_DB_PASSWORD=...
set JWT_SECRET=...
set SEED_PASSWORD=demopassword123
# Hosted AI calls are currently disabled until spend-cap enforcement exists

python -m app.migrate
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
# Create frontend/.env.local:  VITE_API_URL=http://localhost:8000
npm run dev
```

The UI requires a successful backend sign-in. When `VITE_DEMO_MODE=true`, the login page shows demo role buttons that log in automatically using the configured `VITE_DEMO_PASSWORD`. Use the **Switch role** dropdown in the nav bar to switch roles without a separate browser profile.

---

## Architecture

```
frontend/          React + Vite + Tailwind CSS
backend/
  app/
    api/           FastAPI routers
                     auth, facts, rules, content, findings,
                     blast_radius, redteam, chaos
    core/          Config, DB pool, RBAC, security, errors, audit
    services/      claim_extractor, checker, blast_radius, extraction,
                   redteam, chaos, retrieval
    scripts/       evaluate.py — precision/recall on labelled test set
  tests/           unit and database integration tests
db/
  migrations/      versioned migrations, including RLS and graph foundations
  grants.sql
```

PostgreSQL with `pgvector` extension. Row-level security policies are defined per organisation; deployment must use a restricted non-owner role and be verified separately.

**Stack:** Vite + React + Tailwind CSS frontend; FastAPI backend; PostgreSQL + pgvector.
**Note:** The Round 1 proposal mentioned Next.js — the implementation uses **Vite + React** (not Next.js).
**Note:** Optional provenance-aware pgvector matching is experimental and disabled by default; embeddings are not generated by this service. Document vector retrieval remains unfinished.

---

## API (key endpoints)

| Method | Path | Description |
|---|---|---|
| POST | `/v1/auth/register` | Create org + admin user |
| POST | `/v1/auth/login` | Get JWT |
| GET | `/v1/facts` | List all facts |
| POST | `/v1/facts/{id}/blast-radius` | Run blast-radius scan |
| GET | `/v1/blast-radius/{fact_id}` | Get latest scan for a fact |
| POST | `/v1/content` | Submit content (text) |
| POST | `/v1/content/{id}/analyse` | Run deterministic analysis |
| POST | `/v1/content/{id}/redteam` | Run four-persona Red Team (currently demo heuristics) |
| POST | `/v1/findings/{id}/debate` | Generate Prosecutor vs Defender |
| POST | `/v1/findings/{id}/decide` | Record human decision |
| POST | `/v1/rules/{id}/chaos-test` | Run tone interpretation test (currently demo heuristics) |
| POST | `/v1/rules/{id}/review-cases` | Create human-review cases for an approved rule |
| GET | `/v1/graph/facts/{id}/paths` | Explore fact-to-channel graph snapshot paths |
| GET | `/v1/chaos-runs/{run_id}` | Get chaos run result |
| POST | `/v1/chaos-cases/{id}/label` | Set human label |
| POST | `/v1/chaos-issues/{id}/resolve` | Accept/reject clarification |

Interactive docs: http://localhost:8000/docs

---

## Demo walkthrough

See `docs/demo-script.md` for the full 5-minute script.

1. **Repository** → approve `customer_count` v2 (65,000+) with Approver account → **Blast Radius** → Run Scan → see Confirmed + Possible items
2. **Content** → click a risky draft → "Run Red Team" → go to **Findings** → "Show debate" → record a decision
3. **Rule Tests** → select R-01 or R-14 → Run Test → label a borderline case → accept the clarification

---

## Running tests

```bash
cd backend
pytest -q
```

To run the evaluation script on the fictional test set (not a real-world accuracy benchmark):

```bash
python -m scripts.evaluate
```
