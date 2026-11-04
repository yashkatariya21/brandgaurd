# BrandGuard – Round 2 Task Board

Last updated: November 2026

---

## Round 2 Tasks

| Task | Description | Status | Files changed |
|---|---|---|---|
| **T1** | Fix blast radius — confirmed/possible labels, no false positives, A-05 is possible | ✅ Done | `api/blast_radius.py`, `services/claim_extractor.py`, `pages/BlastRadiusPage.tsx`, `api.ts` |
| **T2** | Wire Red Team — 3 personas, endpoint + UI, demo-mode badge | ✅ Done | `api/redteam.py` (new), `services/redteam.py`, `pages/ContentPage.tsx`, `api.ts` |
| **T3** | Prosecutor vs Defender — endpoint + UI, no AI verdict, human decision | ✅ Done | `api/redteam.py`, `pages/FindingsPage.tsx`, `api.ts` |
| **T4** | Chaos Testing — endpoint + page, 5 interpreters, agreement score, ambiguity flag, human labels, clarification | ✅ Done | `api/chaos.py` (new), `services/chaos.py`, `pages/RuleTestsPage.tsx` (new), `App.tsx`, `Layout.tsx`, `api.ts` |
| **T5** | Checker confidence labels — deterministic=confirmed/high, value-only=possible/medium | ✅ Done | `services/checker.py` |
| **T6** | Tests + evaluation script | ✅ Done | `tests/test_blast_radius.py`, `tests/test_checker.py`, `tests/test_redteam.py`, `tests/test_chaos.py`, `scripts/evaluate.py`, `tests/data/labelled_cases.json` |
| **T7** | Retrieval — structured fact/rule context for Red Team and findings | ✅ Done | `services/retrieval.py` (new) |
| **T8** | Docs — README, disclosure, demo-script, task-board | ✅ Done | `README.md`, `docs/disclosure.md`, `docs/demo-script.md`, `docs/task-board.md` |

---

## Definition of Done — Round 2

| Criterion | Status |
|---|---|
| Blast radius: confirmed vs possible, A-05 is possible, results persisted, UI shows match type + scope note | ✅ |
| Red Team: endpoint + UI, findings saved as possible/persona, demo-mode badge | ✅ |
| Prosecutor vs Defender: endpoint + UI, saved in debates, no AI verdict, human decision recorded | ✅ |
| Chaos testing: endpoint + page, 5 interpretations/case, agreement score, ambiguity flag, human labels, suggested clarification | ✅ |
| Checker labels correct; confidence rules followed | ✅ |
| New tests pass with original 18; CI green; evaluation script prints measured numbers | ✅ |
| README, disclosure, demo-script, task-board updated | ✅ |

---

## Persona names (final)

- **Brand Police** (brand voice and consistency)
- **Legal Eagle** (legal and compliance risk)
- **Customer Voice** (customer trust and clarity)

These match the service code in `services/redteam.py`. The Round 1 document should be updated to use these names (not "Skeptical Journalist / Legal-risk Reviewer / Context Reviewer").

---

## Deviations from Round 1 document

| Topic | Round 1 doc said | Actual implementation |
|---|---|---|
| Frontend stack | "Next.js" | Vite + React + Tailwind CSS |
| Vector search / RAG | Round 2 | pgvector installed but unused in Round 2; retrieval uses structured fact/rule lookup; vector search deferred to Round 3 |
| Persona names | Not specified | Brand Police / Legal Eagle / Customer Voice |
| Debate verdict | "panel verdict" | Removed — no AI verdict; human decides |

---

## Round 3 (not started)

Advanced blast radius, full chaos testing (all rule families, contradiction/gap detection, regression), Customer persona (4th reviewer), repeated-run stability, Content Passport (Ed25519 signing), image/OCR, dashboards, MCP server.
