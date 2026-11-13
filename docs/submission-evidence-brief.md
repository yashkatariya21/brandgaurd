# BrandGuard — Submission Evidence Brief

**Project:** BrandGuard · **Team:** VIT REPRESENT · **Lead:** YASH S  
**Repository:** https://github.com/yashkatariya21/brandgaurd

**Scope:** This brief includes current unmerged branch changes; it is not proof that those changes are deployed.

BrandGuard is a governance prototype for versioned facts and rules. It checks registered content for potential problems and helps reviewers record decisions. It does not publish or change content automatically. Demo data is fictional.

## Promised vs. delivered

| Area | Implemented | Honest boundary |
| --- | --- | --- |
| Dependency-graph Blast Radius | Version comparison; Confirmed/Possible results; fact–claim–content–channel snapshot paths; registered-state prioritisation. | Registered content only. Graph paths are not proof of staleness or publication. Character similarity is uncalibrated; optional pgvector candidates are disabled and require supplied labelled vectors. No embedding generation or document-vector search. |
| Evidence-grounded Red Team | Four persona perspectives, checked source references, grouping and stability filtering; human decisions. | Hosted calls are disabled until a monetary cap exists. Demo heuristics are not AI; repeated demo results do not measure reliability. Valid citations do not establish a conclusion. |
| Guideline Chaos Testing | Candidate contradictions and gaps; human decisions; review cases for any rule family; saved labels and comparison snapshots; checker regression on selected seeded rules. | No full automated checker across every family. Heuristic agreement is not correctness; human labels are judgments. |
| Governance and control | Versioned records, approval workflows, database isolation mechanisms, audit and human decisions. | Deployed role/RLS configuration and live end-to-end flow must be checked; no legal advice or automatic publication. |

## Verifiable engineering evidence

- [GitHub Actions run 43367031731](https://github.com/yashkatariya21/brandgaurd/actions/runs/43367031731) passed at commit `7855164e820ee89ee865a588f561a5b93c5d1fbf`: PostgreSQL/pgvector, migrations, seed, backend tests and the no-skips guard; frontend lint/build also passed. This is not evidence for later commits or production.
- Local current-branch checks: **145 passed, 45 skipped** in Python 3.11; frontend lint/build passed. Skips include DB-backed tests. Independent QA and current-branch DB CI remain outstanding.
- Runtime is currently **demo/heuristic**, not live hosted AI. The stop on provider calls is a spend-safety measure, not an implemented monetary cap. No live AI rehearsal or accuracy claim is made.

## Hosting and demo

Backend configuration targets Render at `https://brandgaurd-ibin.onrender.com`; the frontend is configured for Vercel. A current live-browser check, CORS, database runtime permissions and actual frontend URL have not been independently verified in this session. Check `/health` immediately before the demo and use the confirmed frontend URL supplied by the team.

Suggested walk-through: submit and approve a fact change using distinct roles; scan registered content; review a Possible finding and its sources; create and label rule-test cases. Report actual on-screen results. Do not claim that all content was scanned, citations prove arguments, demo repetitions establish reliability, or the product gives legal advice.

Detailed evidence and remaining work: `docs/QA-report.md`, `docs/proposal-verification.md`, `docs/disclosure.md`.
