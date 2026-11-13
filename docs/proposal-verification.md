# Proposal verification and remaining work

Source reviewed: user-provided **BrandGuard Round 2 Advanced Proposal**, 14 pages. Section 25 (page 12) expressly calls its Round 3 items planned, not delivered. This is a source/code review, not independent QA or a production-readiness attestation. The document's historical Round 2 claims should not be read as proof of this branch's current runtime or deployments.

| Proposal item | Current repository / branch | Verification and outstanding work |
| --- | --- | --- |
| Versioned facts, approvals, separation of duties (pp. 5–6) | API, schema, approval flow and repository UI exist. | Local database tests skipped; hosted permissions, seeded credentials and browser journey not verified here. |
| Registered-content Blast Radius, Confirmed/Possible (pp. 5–6) | Version comparison and one-hop graph exist. This branch adds experimental optional vector candidates against superseded versions. | Registered current content only; semantic matches are Possible, disabled by default, uncalibrated and require supplied provenance-labelled vectors. No embedding generation. Current PostgreSQL integration test skipped locally. Multi-hop impact traversal is unfinished. |
| Temporal Truth and Embargo Guard (p. 6) | Expiry and literal embargo checks exist; checker-chaos cases exercise active terms. | Literal matching is incomplete; database-backed behavior not verified locally. |
| Upload and deterministic analysis (p. 6) | TXT/PDF/DOCX extraction, multipart endpoint and upload UI exist. | Local mocked upload tests and pure extraction tests pass; no live or browser upload verification. |
| Adversarial Red Team and fourth competitor persona (pp. 6–7, 12) | Four personas, passage/fact/rule citation validation and stability filtering exist. | Findings are Possible; demo repetitions do not measure stability. Live hosted calls disabled pending monetary-cap enforcement; no live AI rehearsal. |
| Prosecutor/Defender debate (pp. 6–7) | Debate UI, cache and revalidated finding evidence exist; human decides. | Demo review prompts cite revalidated finding references, not validated substantive arguments. Cached live arguments remain uncited and unverified. No legal advice or automatic edit. |
| Tone chaos, human labels/decisions (p. 7) | Tone demo interpretation, case labels and issue decisions exist. | Heuristic agreement is not correctness. Hosted AI disabled; independent QA and end-to-end database/browser validation remain. |
| All rule families, contradictions, gaps and regression (p. 12) | Heuristic conflict and coverage candidates, human decisions for version pairs, and persisted checker diffs exist. | Any rule family with saved examples can create human-labelled review sets, but automated full-family chaos is not delivered; deterministic checker testing supports only unchanged seeded product-name and embargo rules. Human-review sets now support persisted point-in-time diffs across rule families, but this is not automated checker regression for those rules. |
| Vector retrieval over uploaded brand documents (p. 12) | pgvector and experimental graph vector comparisons exist. | Document chunk ingestion, embedding generation and document vector retrieval are not implemented; no calibration. |
| Content Passport, signed integrity (p. 12) | Reserved schema only. | Not implemented; no C2PA compliance claim. |
| Image/OCR, cross-modal, analytics dashboards, Brand MCP (p. 12) | Existing dashboard shows workspace data; listed advanced media and ecosystem features are not established. | Image/OCR checks, cross-modal triangulation and MCP are not implemented or verified. |
| Full QA, CI, live-AI rehearsal, lockfile, hosted deployment (p. 12) | Existing CI, frontend lockfile and deployment configuration; earlier PR CI passed on an earlier commit. | Current uncommitted branch has not run DB-backed CI or browser/deployed tests. Backend requirements use ranges. No independent QA sign-off or live-provider rehearsal. |

## Local checks on this branch

- Python 3.11 suite: **138 passed, 44 skipped**; the skipped set includes PostgreSQL tests and some independently runnable modules.
- Explicitly ran the pure `test_llm_safety.py`, `test_extraction.py` and `test_request_validation.py` modules with dummy DB environment values: **18 passed**. This does not connect to or validate a database.
- Frontend lint and production build passed. No live browser walkthrough or production deployment test was performed.
- Hosted-model requests are fail-closed until an actual monetary cap is enforced; an API key alone does not enable calls. This is a zero-call guard, not a completed spending-cap implementation.

No external provider calls, public-web content scanning, independently verified performance or customer outcomes are claimed.
