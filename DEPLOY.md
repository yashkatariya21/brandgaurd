# BrandGuard — Deployment Guide
## Vercel (frontend) + Render (backend + Postgres)

---

## Step 1 — Merge the PR first

Go to your GitHub PR and merge `feat/ui-redesign-local-auth` into `main`.
Everything below reads from `main`.

---

## Step 2 — Deploy the backend on Render

### 2a. Create account
Go to https://render.com → sign up with GitHub.

### 2b. New Blueprint (reads render.yaml automatically)
1. Dashboard → **New** → **Blueprint**
2. Connect your GitHub repo `yashkatariya21/brandgaurd`
3. Render reads `render.yaml` and shows you two resources:
   - `brandguard-api` (web service)
   - `brandguard-db` (Postgres)
4. Click **Apply**

### 2c. Set secret environment variables
In the Render dashboard → `brandguard-api` → **Environment**, add:

| Key | Value |
|-----|-------|
| `APP_DB_PASSWORD` | any random string, e.g. `AbCd1234XyZ!` |
| `JWT_SECRET` | run `python -c "import secrets; print(secrets.token_hex(32))"` and paste |
| `CORS_ORIGINS` | `http://localhost:3000` for now — you'll update this after Vercel deploy |
| `SEED_PASSWORD` | any string ≥10 chars, e.g. `Demo@2026BG` |
| `OPENAI_API_KEY` | your OpenAI key, or leave blank for demo mode |

### 2d. Note your backend URL
After the first deploy finishes (takes ~3 min), copy the URL shown:
```
https://brandguard-api.onrender.com
```
You'll need this in Step 3.

---

## Step 3 — Deploy the frontend on Vercel

### 3a. Create account
Go to https://vercel.com → sign up with GitHub.

### 3b. Import project
1. Dashboard → **Add New** → **Project**
2. Import `yashkatariya21/brandgaurd` from GitHub
3. Vercel detects Vite automatically

### 3c. Configure build settings
| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 3d. Add environment variable
| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://brandguard-api.onrender.com` (your Render URL from Step 2d) |

### 3e. Deploy
Click **Deploy**. Done — Vercel gives you a URL like:
```
https://brandguard-yashkatariya21.vercel.app
```

---

## Step 4 — Update CORS on Render

Now that you have your Vercel URL, go back to Render:

1. `brandguard-api` → **Environment**
2. Update `CORS_ORIGINS`:
   ```
   https://brandguard-yashkatariya21.vercel.app
   ```
   (replace with your actual Vercel URL)
3. Save → Render auto-redeploys (~1 min)

---

## Step 5 — Verify it works

1. Open your Vercel URL
2. Sign in (local auth works immediately — no backend needed)
3. Try **Repository** → should load facts from Render's Postgres
4. Check `/health`: `https://brandguard-api.onrender.com/health` → `{"status":"ok"}`

---

## Troubleshooting

### Frontend shows blank page / 404 on refresh
`vercel.json` handles this — already configured. If it still happens,
check Vercel dashboard → **Settings** → confirm root directory is `frontend`.

### Backend cold start (30–60s delay on first request)
Normal on Render's free tier. The service spins down after 15 min of
inactivity. Subsequent requests are fast. Upgrade to a paid plan to remove.

### CORS error in browser console
`CORS_ORIGINS` on Render doesn't match your Vercel URL exactly.
Make sure there's no trailing slash and it starts with `https://`.

### Database connection error
Render links `DATABASE_URL` automatically from `brandguard-db`.
Check that the database service is also running in your Render dashboard.

### Migrations didn't run
The `CMD` in `Dockerfile.render` runs `python -m app.migrate` on every
start. Check Render logs → `brandguard-api` → **Logs** for migration output.

---

## What the user needs to provide (from their side)

| Thing | Where |
|-------|-------|
| GitHub repo access | Already connected |
| `JWT_SECRET` (generate it) | Render dashboard env vars |
| `APP_DB_PASSWORD` (any string) | Render dashboard env vars |
| `SEED_PASSWORD` (any string ≥10) | Render dashboard env vars |
| `OPENAI_API_KEY` (optional) | Render dashboard env vars |
| Vercel URL (auto-generated) | Copy from Vercel → paste into Render CORS |
