# Disclosure Log (competition rules 6 and 7)

| Item | Type | Where used | Pre-window? |
|---|---|---|---|
| Claude (Anthropic) | AI tool | Planning documents, agent configuration, and generation of repository code (Phase 1 onward) | Planning and agent config: yes. Code: generated at the start of the build window |
| NimbusDesk Evaluation Pack | Synthetic dataset (invented) | backend/app/seed_data.py, eval/ | Yes |
| Agent team configuration (CLAUDE.md, .claude/agents) | Process tooling | Development workflow | Yes |
| FastAPI, Uvicorn, psycopg, bcrypt, PyJWT, Pydantic, pytest, httpx | Open-source libraries | backend | No |
| PostgreSQL, pgvector | Open-source database and extension | db | No |
| GitHub Actions, Docker | Tooling | CI and local run | No |
