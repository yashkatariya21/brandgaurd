# BrandGuard

AI-powered brand governance platform. Automatically checks marketing content against your approved fact repository — catching stale statistics, wrong prices, banned product name forms, and embargo violations before they go live.

Built for the **Inkloom AI Hackathon 2026**.

---

## What it does

1. **Fact Repository** — store approved facts (customer counts, prices, certifications, product names) with version history, expiry dates, and approval workflows with separation-of-duties.
2. **Brand Rules** — 15 pre-loaded brand governance rules (tone, terminology, claims, accessibility, embargo) with example violations.
3. **Content Analysis** — paste or upload marketing copy; BrandGuard extracts every factual claim and checks it deterministically against the approved facts.
4. **Findings & Decisions** — reviewers accept, edit, dismiss, or escalate each finding with a full audit trail.
5. **Blast Radius** — when a fact changes, instantly see every content asset that references the old value and needs updating.

---

## Quick start (Docker)

```bash
cp .env.example .env
# Edit .env — set OWNER_DB_PASSWORD, APP_DB_PASSWORD, JWT_SECRET, SEED_PASSWORD

docker compose up --build
```

The seed script auto-loads the **NimbusDesk** demo workspace on first start.

Open http://localhost:3000 and sign in with any of:

| Role | Email | Password |
|---|---|---|
| Admin | admin@nimbusdesk.example | `$SEED_PASSWORD` |
| Brand Manager | brand@nimbusdesk.example | `$SEED_PASSWORD` |
| Approver | approver@nimbusdesk.example | `$SEED_PASSWORD` |
| Creator | creator@nimbusdesk.example | `$SEED_PASSWORD` |

---

## Local dev (without Docker)

### Backend

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate    # Windows
pip install -r requirements.txt

# Set env vars (copy from .env.example)
set DATABASE_URL=postgresql://brandguard_app:...@localhost:5432/brandguard
set MIGRATION_DATABASE_URL=postgresql://brandguard_owner:...@localhost:5432/brandguard
set APP_DB_PASSWORD=...
set JWT_SECRET=...
set SEED_PASSWORD=demopassword123

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

The UI includes **dummy auto-login** — if the backend is unavailable it loads a demo user so you can browse the interface without a running server.

---

## API

Base URL: `http://localhost:8000`

| Method | Path | Description |
|---|---|---|
| POST | `/v1/auth/register` | Create org + admin user |
| POST | `/v1/auth/login` | Get JWT |
| GET | `/v1/me` | Current user info |
| GET | `/v1/facts` | List all facts |
| POST | `/v1/facts` | Create fact |
| GET | `/v1/facts/{id}` | Fact detail + versions + aliases |
| POST | `/v1/facts/{id}/versions` | Propose new version |
| POST | `/v1/facts/{id}/versions/{no}/submit` | Submit draft for approval |
| POST | `/v1/facts/{id}/versions/{no}/approve` | Approve version |
| POST | `/v1/facts/{id}/versions/{no}/reject` | Reject version |
| POST | `/v1/facts/{id}/blast-radius` | Run blast-radius scan |
| GET | `/v1/rules` | List all rules |
| POST | `/v1/content` | Submit content (text) |
| POST | `/v1/content/upload` | Submit content (file) |
| GET | `/v1/content` | List content items |
| GET | `/v1/content/{id}` | Content detail + claims + findings |
| POST | `/v1/content/{id}/analyse` | Run analysis |
| GET | `/v1/findings` | List findings |
| POST | `/v1/findings/{id}/decide` | Accept / edit / dismiss / escalate |

Interactive docs: http://localhost:8000/docs

---

## Architecture

```
frontend/          React + Vite + Tailwind CSS
backend/
  app/
    api/           FastAPI routers (auth, facts, rules, content, findings, blast_radius)
    core/          Config, DB pool, RBAC, security, errors, audit
    services/      claim_extractor, checker, extraction, blast_radius, chaos, redteam
db/
  migrations/      001_init.sql — full schema with RLS
  grants.sql       Role-based DB permissions
```

PostgreSQL with `pgvector` extension. Row-level security isolates each organisation's data at the database layer.

---

## Demo walkthrough

1. Open **Repository** → approve the `customer_count` v2 (65,000+) using the Approver account
2. Open **Blast Radius** → select `customer_count` → Run Scan → see all assets with the old "50,000+" figure
3. Open **Content** → submit any text that mentions "50,000 customers" → Run Analysis → see findings
4. Open **Findings** → decide on each finding (accept / dismiss / escalate)
