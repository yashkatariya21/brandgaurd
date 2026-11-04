# Decisions Log

| Date | Decision | Options considered | Chosen | Owner | Approved by human? |
|---|---|---|---|---|---|
| (pre-window) | Product identity and three named improvements fixed | n/a | BrandGuard; Brand-as-Code, Red Team, Chaos Testing | Human leader | Yes |
| 2026-11-04 | Stabilization scope for this work session | Polish the existing Round 2 product; begin Round 3 work | Polish and verify Round 2 only | Human leader | Yes |
| 2026-11-04 | New facts and rules must not become active before review | Directly activate on creation; require a distinct approver | Create as pending approval and require a different user to approve | Backend architect | No |
| 2026-11-04 | Provider errors must not be presented as successful model output | Keep key-based `llm` label; return deterministic fallback with explicit demo/mixed mode | Use configured model metadata and disclose demo/mixed fallback per feature | Backend architect | No |
| 2026-11-04 | Offline UI should not invent an authenticated identity | Synthetic demo user; require backend authentication | Require backend sign-in; keep demo-account buttons as credential helpers | UI director | No |
| 2026-11-04 | Local startup should fail early on missing secrets and wait for dependencies | Best-effort startup; health-checked Compose dependencies | Require local credentials and gate dependent services on health checks | Integration director | No |
