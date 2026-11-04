# BrandGuard Product Specification — Round 2

**Status:** Round 2 scope specification, grounded in the current repository. The task board reports its Round 2 implementation tasks complete; the QA report is still a placeholder, so this document is not release sign-off.

## Product

BrandGuard is an operating system for checking marketing content against an organisation’s approved brand facts and rules before publication. It helps teams find potentially stale claims and brand risks, understand the evidence and scope, and record a human decision. It does not publish content or apply corrections automatically.

The Round 2 product is built around these three improvements, whose names are fixed:

1. **Brand-as-Code with Blast-Radius Intelligence** — versioned facts and rules, controlled approvals, and visibility into registered content that may be affected when a fact changes.
2. **Adversarial Brand Red Team** — three reviewer perspectives and a Prosecutor vs Defender discussion that presents arguments without deciding the outcome.
3. **Guideline Chaos Testing** — generated cases and multiple interpretations to expose ambiguity in tone rules; people label cases and decide whether to accept a suggested clarification.

## Users and control

The application has organisation-scoped users and role-based permissions, including Admin, Brand Manager, Approver, Manager, Creator, and External Creator. Brand Managers/Admins can propose fact and rule versions; Admins/Approvers can approve them. A user cannot approve their own fact or rule version. Content findings require a human decision.

Available finding decisions are **accept**, **edit**, **dismiss** (with a reason code), and **escalate**. Decisions and relevant actions are recorded in an audit trail. A suggested edit or clarification is advisory: BrandGuard does not apply it to content or change approved facts on its own.

## Round 2 capabilities

### Brand repository and impact review

- Maintain facts and rules with version history and approval states. Fact records support values, aliases, qualifiers, and validity/expiry information.
- Analyse submitted content against current approved facts and configured rules.
- Run a blast-radius scan across content registered in the organisation when a fact changes. Results identify old-value references, updated-value references, and unrelated items, with content status used to help prioritise review.
- Distinguish **Confirmed** deterministic matches from **Possible – needs confirmation** matches. A value-only match is not proof that the content refers to the same fact. Reports are limited to registered content; they are not a scan of external or unregistered material.

### Content analysis and review

- Accept submitted content as text or through the implemented upload flow, retain content versions, extract factual claims, and link claims to approved facts where possible.
- Deterministic checks cover configured cases including value mismatch, expired facts, banned product-name forms, and active embargoed terms.
- Findings retain their source and confidence. **Confirmed** is reserved for deterministic checks; AI/persona judgments and uncertain value-only matches remain **Possible** and require human review. These labels describe evidence, not an automatic publishing decision.
- Findings can be reviewed and decisions recorded with reasons where applicable.

### Adversarial Brand Red Team

- Run three independent perspectives over a content item: **Brand Police** (brand consistency), **Legal Eagle** (legal/compliance risk perspective), and **Customer Voice** (customer trust and clarity).
- Red Team findings are **Possible** judgments, not confirmed violations. Legal Eagle is not legal advice.
- A finding can be opened in a Prosecutor vs Defender debate. The product shows both arguments and may offer a minimal-edit suggestion; neither side is a verdict and only a person decides.

### Guideline Chaos Testing

- Round 2 supports **tone rules only**.
- Generate balanced pass, fail, and borderline cases and collect five independent interpretations for a case. The agreement score is the proportion of interpreters in agreement; low agreement indicates possible ambiguity, not that a case is objectively wrong.
- A person can label cases and accept or reject a proposed clarification. Human labels remain the ground truth.
- The UI/API can use the configured OpenAI model when `OPENAI_API_KEY` is present. Without a key, heuristic/demo-mode behavior is used and identified as demo mode; it is not represented as real AI output.

## Platform and data boundaries

- Frontend: Vite, React, and Tailwind CSS. Backend: FastAPI. Data: PostgreSQL with `pgvector` installed.
- Organisation isolation is enforced in application/database access. AI-provider use is disclosed. When enabled, relevant content, fact/rule context, or rule-test text is sent to OpenAI as described in [`disclosure.md`](disclosure.md).
- Round 2 retrieval uses structured approved fact/rule lookup. Although `pgvector` is installed, vector search is not used in this round.
- The product operates on content and repository records available to the user's organisation; it does not independently verify claims against the public web.

## Priorities for Round 2 polish

1. Preserve clear evidence and scope for every finding, especially the Confirmed/Possible distinction.
2. Keep human decisions, approvals, and audit history explicit; never auto-publish or silently edit approved data/content.
3. Keep the blast-radius demonstration honest about registered-content coverage and uncertain matches.
4. Keep the tone-rule test demonstration clear about agreement, ambiguity, demo-mode heuristics, and human labels.
5. Validate the documented flows against the implementation and tests before claiming release readiness; record actual QA results in `QA-report.md`.

These are polish and verification priorities, not approval to add Round 3 features.

## Out of scope for Round 2

Do not treat the following as shipped Round 2 behavior: advanced dependency-graph blast-radius analysis, Chaos Testing across all rule families or regression suites, a fourth competitor persona, image/cross-modal analysis, Content Passport/QR or signing, Brand MCP, vector-based retrieval, and analytics dashboards. The roadmap may consider these later without destabilising the Round 2 MVP.

Content Passport is C2PA-inspired only; BrandGuard does **not** claim C2PA conformance. BrandGuard does not provide legal advice.

## Implementation references

The current scope is represented by the feature services and APIs under `backend/app/services/` and `backend/app/api/`, their corresponding tests under `backend/tests/`, the Round 2 status in [`task-board.md`](task-board.md), and the demo flow in [`demo-script.md`](demo-script.md). The task board records T1–T8 as done, but the separate QA report has not yet been completed; therefore this specification does not claim independent QA sign-off.
