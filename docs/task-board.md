# Task Board

Status values: Done (verified), Partial, Untested, Not started.

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| T01 | Repo, CI, env template, disclosure log | Integration | Partial | Files written; CI workflow not yet run on GitHub; Docker compose not run |
| T02 | Auth, memberships, RBAC middleware, RLS | Backend | Done (Phase 1 scope) | 18 tests passed against local PostgreSQL 16 with pgvector |
| T03 | Schema and migrations | Backend | Done | 001_init.sql applied cleanly; constraints and triggers covered by tests |
| T04 | Seed loader for NimbusDesk | Backend, AI | Done | Seeded 16 facts, 15 rules, 12 assets, 6 users; idempotent; reset works |
| T05 | Facts and rules CRUD with versions and approval | Backend | Not started | |
| T06 | Frontend shell and repository screens | UI/UX | Not started | |
| T07 to T29 | See Build Blueprint | all | Not started | |

QA note: these results come from the author's own run. Independent QA verification (T20) has not happened.
