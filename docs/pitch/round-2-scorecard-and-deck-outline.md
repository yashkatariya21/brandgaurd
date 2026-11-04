# BrandGuard — Round 2 judge scorecard and pitch outline

**Round:** 2 only. Do not frame Round 3 roadmap items as delivered.

**Evidence standard:** scores remain provisional source-review estimates, not judge results or QA certification. Local frontend build/lint, selected database-independent backend tests, the labelled evaluation script, and Compose configuration checks have run; database-backed flows, the full suite, CI, and live LLM calls have not.

## Provisional score against the official Round 2 criteria

| Criterion | Provisional score | Evidence and scoring rationale | Main risk / what to verify |
|---|---:|---|---|
| Core workflow end to end (30) | **23 / 30** | Source contains a NimbusDesk seed, role-based fact version submission/approval, blast-radius UI/API, content submission, persona findings, findings decisions, and tone-rule test flows. The seeded v2 submit action calls the submit-version endpoint; blast-radius results are persisted, and decisions/labels are written through API endpoints. | No runtime walkthrough was executed. Two accounts need isolated browser profiles because auth tokens are shared across tabs on the same origin. |
| Technical depth and reliability (25) | **16 / 25** | Clear frontend/API/service/database separation; tenant-scoped queries; versioned facts; analysis/debate/chaos persistence; audit writes; and tests for validation, extraction, LLM safety, and blast radius are present. | Local checks do not replace DB-backed QA: containers, RLS journeys, the full suite, and CI remain unverified. Provider failures have explicit demo/mixed modes in source, but live provider behavior was not exercised. |
| Progress against plan (20) | **16 / 20** | The Round 2 task board marks T1–T8 complete and the current code contains the named workstreams. The demo can emphasize the three required improvements. | The task board is a status assertion, not independent evidence. The integration report records limited local checks; `docs/QA-report.md` still awaits independent QA, and database-backed flows remain unverified. |
| The three improvements (15) | **12 / 15** | **Brand-as-Code with Blast-Radius Intelligence** has versioned facts and an affected-content scan; **Adversarial Brand Red Team** includes three personas and a Prosecutor-vs-Defender panel with human decision; **Guideline Chaos Testing** generates tone-rule cases, compares five interpretations, and records annotations/resolutions. | Keep these exact improvement names. The Round 2 implementation is a thin slice: no full dependency graph is exposed; Chaos Testing only supports tone rules; in demo mode the “interpreters” are heuristics, not independent AI models. |
| Usability (10) | **7 / 10** | Dedicated pages for Repository, Content, Blast Radius, Findings, and Rule Tests; visible confirmed/possible and demo-mode labels; role indicators; explicit sign-in; and a clear human decision step are implemented in source. | Authentication, separate role profiles, and approval setup require a rehearsed operator flow. |
| **Total (100)** | **74 / 100** | A provisional evidence-based estimate from source review only. | Re-score after independent build, tests, and an end-to-end live rehearsal. |

### Orchestrator heads-up: resolve or disclose before presenting

1. **Source flow is aligned, runtime still unverified:** the seeded v2 UI action now calls `factsApi.submitVersion` and the implemented submit endpoint; an approver then approves. Include this in rehearsal, but do not claim the browser flow was verified here.
2. **Live AI remains unverified:** Compose forwards optional `OPENAI_API_KEY` and `OPENAI_MODEL`; without a key, the heuristic demo path is used. No live provider request was made, so do not claim hosted-model operation has been verified.
3. **Fallback behavior is labelled in source:** Red Team and Debate use demo output after provider failure; Chaos can report `mixed` when only some calls fall back. The UI shows the mode and provider note. Live outage behavior still needs rehearsal.
4. **Quality evidence is limited:** selected tests and evaluation ran, but no database-backed suite, CI run, independent QA report, full-stack startup, or end-to-end browser journey is verified. Avoid production-readiness or general accuracy claims.
5. **Scope:** no dependency graph is demonstrated in Round 2; Chaos is tone-only. Rehearse the approval sequence and separate role profiles.

## Suggested deck outline (5 slides; no unsupported metrics)

### Slide 1 — Brand truth is operational, not a document

- **Message:** teams need governed facts and rules connected to content decisions.
- **Visual:** factual workflow from repository → registered content → human review.
- **Say:** “BrandGuard is a Round 2 prototype using fictional NimbusDesk data.”
- **Do not say:** that it covers all public content or all marketing channels.

### Slide 2 — Brand-as-Code with Blast-Radius Intelligence

- **Message:** an approved version change can reveal registered content that may need review.
- **Visual:** `50,000+ customers` → `65,000+ customers`; confirmed vs possible match, with A-05 as the attribute-mismatch example if the running scan shows it.
- **Show:** version approval and scan in the app.
- **Caveat on slide or spoken:** only registered content is scanned; “possible” requires human confirmation; no auto-edit/publish; no full dependency graph is claimed for Round 2.

### Slide 3 — Adversarial Brand Red Team

- **Message:** three named perspectives find possible risks and present both sides before a person decides.
- **Visual:** Brand Police / Legal Eagle / Customer Voice → Prosecutor vs Defender → human decision.
- **Show:** actual output and demo/LLM mode badge.
- **Caveat:** the personas are model prompts or deterministic demo heuristics—not independent human experts. All persona findings are possible, not confirmed. Legal Eagle is not legal advice.

### Slide 4 — Guideline Chaos Testing

- **Message:** test a guideline’s consistency at the edges, not just content against the guideline.
- **Visual:** tone-rule cases → five interpretations → agreement and ambiguity signal → human annotation.
- **Show:** R-01 and the recorded demo case if present.
- **Caveat:** Round 2 supports tone rules only. Demo mode uses lightweight heuristics; interpretation agreement is not correctness or objective truth. Accepting an issue does not edit the rule.

### Slide 5 — Honest boundaries and what comes next

- **Delivered in Round 2:** three thin slices named above, registered-content boundary, and human decisions.
- **Limitations:** registered content only; shared model/persona biases; not C2PA-conformant; not legal advice; no measured general accuracy or performance claim.
- **Roadmap wording:** describe any not-yet-built graph expansion, broader rule-family chaos tests, Content Passport/C2PA work, or other advanced capability as future work—not delivered.
- **Ask:** “Which governed fact/rule and approval boundary would your team pilot first?”

## Claims to use / claims to avoid

**Safe to say when observed in the demo:** source contains the named UI/API flows; demo mode is explicitly labelled; the example fact and content are fictional; persona findings are possible; human decisions are separate from suggested edits; the blast-radius endpoint returns a registered-content scope note.

**Avoid unless independently demonstrated:** “all tests pass,” “CI is green,” accuracy/precision/recall percentages, sub-second performance, production-ready, all content scanned, fully independent AI agents, AI fully falls back on outages, a full dependency graph, C2PA compliance, legal review/advice, or any unobserved specific AI result.
