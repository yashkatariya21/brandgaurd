# Decisions Log

| Date | Decision | Options considered | Chosen | Owner | Approved by human? |
|---|---|---|---|---|---|
| 2026-11 (pre-window) | Product identity and three named improvements fixed | n/a | BrandGuard; Brand-as-Code, Red Team, Chaos Testing | King | Yes |
| 2026-11-04 | Phase 1 auth approach | Managed auth provider vs own JWT | Own JWT (bcrypt, HS256) to avoid paid or external dependencies; revisit if a provider is chosen | Backend | Assumed under King's go-ahead; confirm |
| 2026-11-04 | Tenant isolation | App-level filters only vs Postgres row-level security | RLS on every tenant table, transaction-local tenant context, non-superuser app role | Backend | Assumed; confirm |
| 2026-11-04 | Draft fact versions editable, approved ones immutable | Fully immutable vs draft editable | Draft editable, immutable after leaving draft | Backend | Assumed; confirm |
