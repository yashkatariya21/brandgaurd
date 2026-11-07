# BrandGuard

AI-powered brand governance platform. Checks marketing content against your approved fact repository — catching stale statistics, wrong prices, banned product name forms, and embargo violations before they go live. Three innovations: **Blast-Radius Intelligence**, **Adversarial Red Team**, and **Guideline Chaos Testing**.

Built for the **Inkloom AI Hackathon 2026**.

---

## What it does

### 1. Fact Repository & Blast-Radius Intelligence
Store approved facts (customer counts, prices, certifications, product names) with version history, expiry dates, and separation-of-duties approval workflows. When a fact changes, **Blast Radius** instantly shows every content asset that references the old value — with two labels:

- **Confirmed** – exact value match AND attribute matches the fact (e.g. "customers" → `customer_count`). Definitely stale, needs updating.
- **Possible – needs confirmation** – numeric value matches but attribute differs (e.g. "50,000 tickets" matches numerically but is about ticket volume, not customer count). Human review required.

Nothing is changed automatically. A human decides.

### 2. Adversarial Brand Red Team
Three personas — **Brand Police**, **Legal Eagle**, **Customer Voice** — review content from distinct perspectives and flag risks. They use the same configured model, not independent AI systems. All Red Team findings are labelled `possible` (AI judgement, not deterministic proof). Legal Eagle findings carry the note "AI risk perspective, not legal advice."

Each finding can open a **Prosecutor vs Defender** debate: two arguments shown side-by-side so a human can decide. Neither argument is a verdict. The panel never labels anything `confirmed`.

### 3. Guideline Chaos Testing
Test tone brand rules for ambiguity with five interpretations per generated case (≈4 clear-pass, 4 clear-fail, 4 borderline). With an API key these are separate calls to the configured model; demo mode uses five lightweight heuristics instead. The **agreement score** is the number of matching interpretations divided by five. Low agreement flags a case for human review; it does not prove that the rule or verdict is wrong. Human labels record reviewer judgments.

When ≥1 case is ambiguous, a suggested clarification is generated. You can accept or reject it. Round 2 scope: **tone rules only**.

### 4. Content Analysis (deterministic)
Paste or upload content. BrandGuard extracts every factual claim, links it to approved facts, and runs deterministic checks — value mismatch, expired fact, banned product name forms, embargo violations. All deterministic findings are `confirmed` with `high` confidence.

### 5. Findings & Decisions
Reviewers accept, edit, dismiss (with reason), or escalate each finding. Full audit trail. Human always decides — BrandGuard never publishes or auto-applies corrections.

---

## Demo mode (no AI key)

Red Team, Chaos Testing, and Debate have deterministic demo paths when `OPENAI_API_KEY` is not set. These are heuristics or canned arguments, not AI output, and responses identify demo mode. With a key, the API calls OpenAI using `OPENAI_MODEL` (default `gpt-4o-mini`). If a provider call fails, Red Team and Debate fall back to demo output; Chaos can return `mixed` when only some interpretations fall back. The UI shows the mode and any fallback note.

Set `OPENAI_API_KEY` in `.env` to enable real AI (gpt-4o-mini by default).

---

## Confirmed vs Possible

| Label | Meaning | Source |
|---|---|---|
| **Confirmed** | Deterministic check: direct contradiction of an approved fact, banned name form, or embargo violation | `source_kind: deterministic`, `confidence: high` |
| **Possible** | AI judgement / value-only match / persona finding — may be a real issue, needs human review | `source_kind: persona` or `retrieval`, `confidence: low/medium` |

Repeated AI agreement never raises confidence. Disagreement may lower it. A `Confirmed` badge never appears on an AI opinion.

---

## Quick start (Docker)

```bash
cp .env.example .env
# Edit .env — set OWNER_DB_PASSWORD, APP_DB_PASSWORD, JWT_SECRET, SEED_PASSWORD
# Optional: add OPENAI_API_KEY for real AI

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
# set OPENAI_API_KEY=sk-...  (optional)

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
  tests/           18 original tests + new: blast_radius, checker,
                   redteam, chaos
db/
  migrations/      001_init.sql — full schema with RLS
  grants.sql
```

PostgreSQL with `pgvector` extension. Row-level security isolates each organisation's data at the database layer.

**Stack:** Vite + React + Tailwind CSS frontend; FastAPI backend; PostgreSQL + pgvector.
**Note:** The Round 1 proposal mentioned Next.js — the implementation uses **Vite + React** (not Next.js).
**Note:** Vector search (embeddings) is implemented as a database stub (pgvector installed) but not used in Round 2. Retrieval in Round 2 is structured fact/rule lookup. Full vector search is planned for Round 3.

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
| POST | `/v1/content/{id}/redteam` | Run 3-persona red team |
| POST | `/v1/findings/{id}/debate` | Generate Prosecutor vs Defender |
| POST | `/v1/findings/{id}/decide` | Record human decision |
| POST | `/v1/rules/{id}/chaos-test` | Run chaos test (tone rules) |
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

To run the evaluation script (prints measured precision/recall — no hard-coded numbers):

```bash
python -m scripts.evaluate
```
