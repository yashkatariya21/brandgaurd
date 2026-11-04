# BrandGuard

An intelligent brand-governance platform: brand facts and rules as versioned, expiring, owned records; adversarial pre-publication review; and tests for the guidelines themselves. Built for the Inkloom AI competition.

Status: **Phase 1 (tickets T01-T04)**: repository, database, auth and roles, demo data. Later tickets are in the Build Blueprint.

## Run with Docker
```bash
cp .env.example .env        # then fill in JWT_SECRET and SEED_PASSWORD
docker compose up --build   # applies migrations, starts the API on :8000
docker compose exec backend python -m app.seed
```
Health check: `curl localhost:8000/health`. Interactive API docs: http://localhost:8000/docs

Demo logins (password = your SEED_PASSWORD, organisation slug `nimbusdesk`): `admin@`, `brand@`, `approver@`, `manager@`, `creator@`, `agency@` at `nimbusdesk.example`.

## Run tests (needs the database from docker compose, or any Postgres with pgvector)
```bash
cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
export MIGRATION_DATABASE_URL=... DATABASE_URL=... APP_DB_PASSWORD=... JWT_SECRET=...   # see .env.example
python -m app.migrate && pytest -q
```

## Design guarantees checked by tests
- Row-level security: an organisation cannot read or write another organisation's rows; no tenant context means no rows.
- The app database role is neither superuser nor allowed to bypass row-level security.
- `audit_log` is append-only; `content_versions` and `passports` are immutable; fact and rule versions cannot change after leaving draft.
- A fact or rule version cannot be approved by the person who proposed it.
- Dismissing a finding requires a reason.
- Login errors do not reveal whether an email exists; roles are re-read from the database on each request.

## Notes
- Demo reset (deletes everything): `ALLOW_RESET=1 python -m app.seed --reset`.
- The seed leaves `customer_count` at version 1 (50,000+) with version 2 (65,000+) as a draft, for the live blast-radius demo.
- `chunks.embedding` is `vector(1536)`; change it in `001_init.sql` before first use if the chosen embedding model differs.
- Managed Postgres providers may not allow the migration user to create roles; create `brandguard_app` once by hand in that case.

## Limits (honest status)
Only auth, schema, RBAC scaffolding and seed data exist. There is no facts API, content analysis, AI pipeline or frontend yet.
