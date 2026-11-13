# QA report

## Status and independence

This is a developer/AI-assisted verification record, **not an independent QA sign-off**. The user-provided Round 2 proposal and current source were reviewed; no production-readiness, model-accuracy or legal-compliance claim is made. Independent QA and a full end-to-end browser walkthrough are still pending.

## Verified CI on an earlier commit

- [GitHub Actions CI run 43367031731](https://github.com/yashkatariya21/brandgaurd/actions/runs/43367031731) passed for commit `7855164e820ee89ee865a588f561a5b93c5d1fbf` (PR #9 branch head).
- The backend job used a `pgvector/pgvector:pg16` PostgreSQL service, ran migrations and seed data, ran the backend test suite, and passed the JUnit guard that rejects skipped or failed tests. The job's individual migration, seed, test and no-skips steps are recorded as successful in GitHub Actions. The exact test count could not be retrieved from the job log in this environment, so it is not claimed here.
- The same run passed frontend ESLint, TypeScript and production build. The run proves those checks for that commit only; it does not verify later branch changes or a deployed app.

## Current branch local checks

- Backend, Python 3.11: **145 passed, 45 skipped**, one dependency deprecation warning. The skips include database integration tests; no local PostgreSQL/pgvector service was available.
- Separately, 18 pure tests in `test_llm_safety.py`, `test_extraction.py` and `test_request_validation.py` passed with dummy environment values. This did **not** exercise a database.
- Frontend: ESLint and production build passed. The graph-path and review-only-case database integration tests are among the locally skipped tests.
- These results were produced by the developer's agent, not an independent tester. Current uncommitted changes have not run in GitHub CI.

## Not verified or incomplete

- Current-branch PostgreSQL-backed CI, deployed upload/login flows, browser walkthrough, user roles and actual deployed database role/RLS configuration.
- Hosted model calls are intentionally disabled pending a durable monetary spending cap; no live provider rehearsal was performed.
- Optional embedding matching is disabled, requires supplied compatible vectors and is uncalibrated. No claim of real-world accuracy or measured demo stability is supported.
- Human review is required; content is never automatically published or corrected. Review the proposal traceability and outstanding features in [proposal-verification.md](proposal-verification.md).

## Before submission

Run current-commit DB-backed CI and independently review its result; rehearse login, approval, upload, scan, findings and rule-test flows in the deployed browser; verify the runtime database role is restricted; check the backend health endpoint shortly before the demo. Record actual findings and failures rather than inferred results.
