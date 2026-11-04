# BrandGuard – AI Disclosure

## LLM provider

| Service | Provider | Model | Used for |
|---|---|---|---|
| Red Team (3 personas) | OpenAI | gpt-4o-mini (configurable via `OPENAI_MODEL`) | Generating persona findings when `OPENAI_API_KEY` is set |
| Prosecutor vs Defender | OpenAI | gpt-4o-mini | Generating debate arguments when key is set |
| Chaos Test interpretation | OpenAI | gpt-4o-mini | 5 independent rule interpretations per case |
| Chaos case generation | OpenAI | gpt-4o-mini | Generating balanced pass/fail/borderline test cases |

The LLM provider is **OpenAI**. The exact model is configurable via the `OPENAI_MODEL` environment variable (default: `gpt-4o-mini`).

## Data sent to the LLM

When `OPENAI_API_KEY` is set, the following data is sent to OpenAI's API:

- **Red Team:** Content item body text + a summary of approved facts (key: value, version, expiry) + a summary of approved rules (key, description, severity)
- **Debate:** The finding issue text + relevant content body text + related fact/rule context
- **Chaos Test interpretation:** Rule description text + case text (no content or user data)
- **Chaos case generation:** Rule key, label, description, expected behaviour, severity

**No personal data, credentials, or secrets are sent.** Content is fictional NimbusDesk demo data.

## Demo-mode fallback

When `OPENAI_API_KEY` is **not set**, all AI features run in **demo mode**:

- **Red Team:** Deterministic heuristic stubs (regex-based checks for known patterns in the NimbusDesk seed data)
- **Debate:** Pre-written stub prosecutor/defender texts
- **Chaos Test:** Lightweight rule-based interpreter (5 heuristics: exclamation count, emoji, ALL-CAPS ratio, slang, contractions) + pre-written balanced case sets

All demo-mode responses include `"mode": "demo"` in the API response and a "Demo mode (no AI key)" badge in the UI. Demo results are clearly heuristic and not presented as AI output.

## Pre-prepared components

The following were prepared before the hackathon build window:

- The NimbusDesk fictional evaluation pack (seed data, content assets A-01..A-12, fact and rule definitions)
- The agent team configuration (`.claude/agents/`)
- The CLAUDE.md orchestrator rules

## AI-generated code

Portions of this codebase were generated with AI assistance (Claude) during the hackathon build window. All generated code has been reviewed and is disclosed in `docs/decisions.md`.

## What BrandGuard does NOT do

- It does not provide legal advice. Legal Eagle findings carry the note "AI risk perspective, not legal advice."
- It does not publish or auto-apply corrections. A human must decide on every finding.
- It does not claim C2PA compliance. Content passport signatures (Round 3) prove integrity and key identity, not truth.
- It does not claim any specific accuracy numbers. The `scripts/evaluate.py` script measures and prints real numbers on the fictional labelled dataset.
