# BrandGuard demo pack — 2 samples per feature

Every expected result below was computed by running **your actual code** (claim extractor, red-team stub, chaos heuristics, blast-radius matcher) on these files, in no-API-key demo mode.

## Setup

Ensure the backend is running and seeded, then load the demo data:

```bash
API_URL=https://<render-url> SEED_PASSWORD=<your-seed-password> python demo/setup_demo.py load
# Windows:
set API_URL=https://<render-url>
set SEED_PASSWORD=<your-seed-password>
python demo\setup_demo.py load
```

The loader logs in as Brand Manager, submits sample facts/rules and content texts, then logs in as Approver to approve the proposals. Start from the fresh seed state (customer_count v2 still a draft).

---

## 1. Repository (facts + rules)
Files: `1_repository/sample_facts.json`, `sample_rules.json`

| Sample | What to do | Expected |
|---|---|---|
| Fact 1: `support_hours` | Repository → Facts → New Fact (Brand Manager) | Created as `pending_approval` |
| Fact 2: `data_centres` | Same | Same |
| Rule 1: `R-16` (tone) | Repository → Rules → create via API or loader | `pending_approval` |
| Rule 2: `R-17` (tone) | Same | Same |

Then switch to the Approver role (use the "Switch role" dropdown in the nav) and approve each.
**Separation of duties:** the Brand Manager cannot approve their own proposal — you'll see a 409 conflict.
Approved items show full version history.

---

## 2. Content analysis (deterministic checks)
Files: `2_content_review/` — paste the TXT into the Submit form, or upload the DOCX/PDF.

**Sample 1 — `content_sample_1_homepage_copy.txt`** (channel: web)
Expected confirmed findings: banned product name "Nimbus Desk"; value mismatch "Over 40,000 customers" vs approved 50,000+. The $19 price and 4-minute claim link cleanly (no finding).

**Sample 2 — `content_sample_2_press_release.txt`** (channel: press)
Expected confirmed findings: embargoed term "Project Heron" (critical, human review required); banned form "NimbusDESK" (appears twice). "50,000 customers", "120+ integrations" and "$19" match approved facts.

---

## 3. Adversarial Red Team + debate
Files: `3_red_team/` — submit as content, open the item, click **Run Red Team**, then Findings → **Show debate** → **Decide**.

**Sample 1 — `redteam_sample_1_risky_claims.txt`**
- Legal Eagle: absolute guarantee (high); ISO 27001 false claim (critical); Project Heron embargo (critical)
- Brand Police: wrong product name "Nimbus Desk" (high); missing "we/our" voice (low)
- Customer Voice: no concerns raised (zero findings — correct behaviour)

**Sample 2 — `redteam_sample_2_trust_and_ratings.txt`**
- Brand Police: wrong product name (high); "users" instead of "customers" (low)
- Legal Eagle: absolute language "never fail" (high)
- Customer Voice: two different customer counts (medium); star rating/award claim needs a source (medium)

All persona findings must show **Possible**, never Confirmed. Debate text in demo mode is canned. Dismiss requires a reason.

---

## 4. Blast-Radius Intelligence
File: `4_blast_radius/fact_changes.json`. Run Blast Radius **after** approving the new version.

**Scenario 1 — customer_count 50,000+ → 65,000+**
Submit as Brand Manager, approve as Approver (use the role switcher).
Expected: Confirmed **A-01, A-03, A-04, A-06**; Possible **A-05** ("50,000 tickets", different attribute).

**Scenario 2 — starter_price $19 → $22**
Propose the version from JSON, submit, approve, scan "Starter price".
Expected: Confirmed **A-08**. **A-09 will not appear**: "Starter: $19 / Pro: $49 per agent per month" doesn't match the extractor's numeric pattern. Known limitation — document before presenting.

---

## 5. Guideline Chaos Testing
File: `5_chaos_testing/human_labels_to_enter.md`. Run Rule Tests on **R-01** (seeded tone rule).

- Demo mode produces 12 cases with heuristic interpreters.
- Best showpieces: "Great news! Your order has shipped." and "We're happy to have you on board." — both show disagreement.
- Enter the two human labels from the file, then accept the suggested clarification.

---

## Known limitations (mention before a judge does)

1. **A-09 pricing page** not matched by blast radius (see §4 above).
2. **Demo mode interpreters** use lightweight heuristics — not real AI. Label them accordingly in the UI.
3. **Debate text** in demo mode is canned boilerplate, not LLM-generated.
4. **Render free tier** sleeps after ~15 min. Open `/health` ~1 min before a live demo.
