# BrandGuard — Deployment Guide
## Vercel (frontend) + Render (backend + Postgres)

These steps have not been runtime-verified. They describe the intended procedure based on the project's configuration.

---

## 1. Render — Backend

### 1a. Create a Postgres database

- Render dashboard → **New** → **PostgreSQL**
- Name: `brandguard-db`
- Plan: Free (expires after 30 days — upgrade for production)
- Note the **Owner connection string** and **Internal connection string** from the database page

### 1b. Create a Web Service

- Render dashboard → **New** → **Web Service**
- Connect your GitHub repo (`yashkatariya21/brandgaurd`)
- Settings:
  - **Runtime:** Docker
  - **Dockerfile path:** `backend/Dockerfile` *(not `backend/Dockerfile.render`)*
  - **Docker build context:** `.` (repo root — required so the Dockerfile can copy `backend/` and `db/`)
  - **Start command:** *(leave blank — Dockerfile CMD runs migrate + seed + uvicorn)*

  If Render does not honour the Dockerfile CMD, set this manually:
  ```
  sh -c "python -m app.migrate && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port $PORT"
  ```
- **Health check path:** `/health`

### 1c. Set environment variables

In the Render Web Service → **Environment**, add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Internal connection string from Render Postgres — change the user to `brandguard_app` and password to `APP_DB_PASSWORD`. Example: `postgresql://brandguard_app:<APP_DB_PASSWORD>@<host>/<db>` |
| `MIGRATION_DATABASE_URL` | Owner connection string from Render Postgres (full owner access needed for migrations) |
| `APP_DB_PASSWORD` | Any random string — used to create the `brandguard_app` database role during migration |
| `JWT_SECRET` | `python -c "import secrets; print(secrets.token_hex(32))"` — must be ≥32 chars |
| `JWT_TTL_MINUTES` | `60` |
| `SEED_PASSWORD` | Any string ≥10 chars — password for all demo accounts |
| `CORS_ORIGINS` | `http://localhost:3000` for now — update after Vercel deploy (see step 3) |
| `OPENAI_API_KEY` | Your OpenAI key, or leave blank for demo mode |
| `OPENAI_MODEL` | `gpt-4o-mini` |

### 1d. Deploy and note the URL

After the first deploy (~3 min), copy your Render URL:
```
https://brandguard-api.onrender.com   ← example
```

**First-migration note:** the migration script runs `CREATE ROLE brandguard_app`. On some Render Postgres plans, the owner user may lack `CREATEROLE`. If migration fails with a permission error, create the role manually in Render's Psql console:
```sql
CREATE ROLE brandguard_app WITH LOGIN PASSWORD '<APP_DB_PASSWORD>';
GRANT CONNECT ON DATABASE brandguard TO brandguard_app;
```
Then redeploy.

---

## 2. Vercel — Frontend

### 2a. Import project

- vercel.com → **Add New** → **Project**
- Import `yashkatariya21/brandgaurd` from GitHub

### 2b. Configure build settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 2c. Set environment variables

| Key | Value |
|-----|-------|
| `VITE_API_URL` | Your Render URL, no trailing slash — e.g. `https://brandguard-api.onrender.com` |
| `VITE_DEMO_MODE` | `true` |
| `VITE_DEMO_PASSWORD` | Same value as `SEED_PASSWORD` on Render |
| `VITE_ORG_SLUG` | `nimbusdesk` |

**Important:** Vite bakes these values into the built JS bundle at build time. If you change them, you must **redeploy** (trigger a new build). They are not read at runtime.

**Security note:** `VITE_DEMO_PASSWORD` is visible in the built bundle. Only use it with fictional demo data — never with real credentials.

### 2d. Deploy

Click **Deploy**. Vercel gives you a URL:
```
https://brandguard-<hash>.vercel.app   ← example
```

The `vercel.json` in `frontend/` rewrites all routes to `index.html` so React Router works correctly on direct URL access and page refresh.

---

## 3. Update CORS on Render

Go back to Render → `brandguard-api` → **Environment**:

Update `CORS_ORIGINS` to your Vercel URL:
```
https://brandguard-<hash>.vercel.app
```

- No trailing slash
- No wildcard (`*`)
- Multiple origins: comma-separated, no spaces

Save → Render redeploys automatically (~1 min).

---

## 4. Load demo data

After both services are running:

```bash
# macOS / Linux
API_URL=https://brandguard-api.onrender.com SEED_PASSWORD=<your-seed-password> python demo/setup_demo.py load

# Windows
set API_URL=https://brandguard-api.onrender.com
set SEED_PASSWORD=<your-seed-password>
python demo\setup_demo.py load
```

---

## 5. Verify

1. Open your Vercel URL — the login page should appear
2. Click **Start demo** (or enter `brand@nimbusdesk.example` + seed password)
3. Check `/health`: `https://brandguard-api.onrender.com/health` → `{"status":"ok"}`
4. Repository page loads facts from Render's Postgres

---

## Warnings

### Render free tier cold starts
Free web services sleep after ~15 min of inactivity. The first request after idle takes 30–60 seconds to wake. Open `/health` about a minute before a live demo to pre-warm the service.

### Free Postgres expiry
Render's free Postgres plan **expires after 30 days** — data is deleted. Upgrade to a paid plan for persistence beyond a demo.

### VITE_DEMO_PASSWORD in the bundle
Anyone who inspects the built JS can read `VITE_DEMO_PASSWORD`. Only use this with the fictional NimbusDesk seed data. If you ever put real data in the database, rotate all demo passwords and disable `VITE_DEMO_MODE`.

### First migration — CREATE ROLE
If Render Postgres rejects `CREATE ROLE brandguard_app` during migration, see step 1d above for the manual workaround.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Blank page / 404 on refresh | SPA routing | `frontend/vercel.json` handles this — check Vercel root dir is `frontend` |
| CORS error in browser | CORS_ORIGINS mismatch | Ensure value on Render exactly matches Vercel URL (no trailing slash) |
| 401 on all API calls | Token not sent | Check `VITE_API_URL` is set correctly in Vercel env vars and you redeployed after setting it |
| Migration fails | Permission error | See step 1d — create `brandguard_app` role manually |
| Login "Unauthorised" | Wrong password or org slug | Password must match `SEED_PASSWORD` on Render; org slug must be `nimbusdesk` |
