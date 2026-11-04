# Problem and research analysis

**Status:** Evidence review completed; customer need and differentiation are not validated.
**Evidence checked:** repository documents and official competitor pages, 2026-11-04.
**Scope:** Round 2 only. This report does not authorize or propose Round 3 work.

## Evidence boundary

The Round 1 proposal and the full NimbusDesk Evaluation Pack were not found in the repository files reviewed ([repository root](../), [docs directory](./); checked 2026-11-04); `docs/research/` did not exist before this review. The [disclosure](disclosure.md) describes a fictional NimbusDesk pack as pre-prepared, and the [README](../README.md) and [demo script](demo-script.md) refer to its seed workspace and A-01–A-12 examples, but those references are not substitutes for the source pack. The Round 1 design, customer evidence, and any original competitor analysis therefore remain **unverified**. No interviews, surveys, customer outcomes, market-size figures, or accuracy statistics are asserted here. The [task board](task-board.md) records implementation scope and deviations but not the missing proposal (repository documents reviewed 2026-11-04).

## Problem framing — hypothesis, not established demand

**Hypothesis to test:** Teams that produce frequent, multi-channel content may struggle to keep approved facts and brand rules current across a portfolio of content, especially when facts expire or change. A review workflow that identifies affected registered content, distinguishes deterministic evidence from uncertain matches, and leaves decisions to people could help.

This framing is a product hypothesis, not a proven market problem. Competitor product pages show existing investment in brand guidelines, brand-aware writing, digital asset management, and brand compliance checks; they do not establish the frequency, cost, or severity of the hypothesized problem for a particular organization. See the dated source review in [Competitor review](research/competitor-review.md).

## Evidence versus proposed validation

| Topic | What the available evidence supports | What remains unknown / proposed validation |
|---|---|---|
| Current product scope | Project documents describe a Round 2 fact repository, registered-content blast-radius scans, persona-based review, and tone-rule chaos tests. They describe the latter as tone-rule-only and say structured fact/rule lookup is used rather than vector search. This is a record of intended/current project scope, not an independent QA result. ([README](../README.md), [task board](task-board.md); reviewed 2026-11-04.) | Independently exercise each flow, inspect representative outputs, and check its actual coverage and limits before describing it as reliable or complete. |
| User problem and workflow | No user research or organizational workflow evidence was present in the repository materials reviewed ([repository root](../), [docs directory](./); checked 2026-11-04). | Interview brand/compliance/content operators from distinct organization types. Ask for recent examples of stale claims, time to identify and correct affected content, existing controls, and false-positive costs. Seek artifacts or workflow observations where consent and privacy permit; record sample, method, dates, and contradictory evidence. |
| Need for blast-radius tracking | The product documentation scopes scanning to content registered in BrandGuard and includes human review for uncertain matches. ([README](../README.md), [demo script](demo-script.md); reviewed 2026-11-04.) | Test whether target users can register and maintain a useful inventory, what channels/content types they need covered, how often facts change, and whether an affected-content list changes behavior. Do not equate a demo scan with organization-wide coverage. |
| Need for rule ambiguity testing | Project documents describe five interpretations of tone rules, agreement indicators, human labels, and suggested clarifications. ([README](../README.md), [task board](task-board.md); reviewed 2026-11-04.) | Establish whether teams currently evaluate rule ambiguity, whether agreement indicators help, and how human ground-truth labels are created and maintained. Measure repeatability and label quality before treating agreement as a quality score. |
| Competitive position | Public vendor materials document substantial overlap in brand guidance, brand-aware assistance, and content/asset compliance. See [Competitor review](research/competitor-review.md). | Validate a narrower, defensible distinction with buyer interviews and task-based comparisons. Public marketing pages are neither an exhaustive product inventory nor independent evaluations. |

## Feasibility notes — documented scope, not a QA finding

- **Bounded Round 2 scope:** the repository describes text-centric, registered-content workflows, deterministic checks, three review personas, and tone-rule testing. This is a plausible demo boundary; it is not evidence that arbitrary organization-wide content, every rule family, or every channel is covered ([README](../README.md), [task board](task-board.md); reviewed 2026-11-04).
- **Evidence discipline is a key dependency:** users need source facts, ownership, approval state, effective/expiry dates, and traceable matches. A scan can only support claims about the content and rules it actually ingests. The [README](../README.md) scopes its blast-radius scan to registered content (reviewed 2026-11-04); preserve that limitation in demos and product claims.
- **Keep uncertainty explicit:** the project documentation distinguishes deterministic findings from possible/AI-judgment findings and reserves decisions for a human ([README](../README.md), [disclosure](disclosure.md); reviewed 2026-11-04). Validate that these categories remain intelligible and do not imply that a deterministic match always proves a real-world violation.
- **No special public dataset or API is recommended for the core problem at this stage.** The product hypothesis concerns organization-owned facts and content; public sources cannot validate private organizational truth. First validate the workflow and data requirements. Any later external data source would need a defined use, provenance, update policy, and a clear statement that it does not override an organization's approved facts.

## Risks to claims

1. **Unverified source of truth:** the Round 1 proposal and complete evaluation pack are not available in the reviewed repository. Do not claim this report preserves or verifies their original requirements.
2. **No demand evidence:** there are no documented interviews, surveys, workflow observations, or customer outcomes here. Do not describe the problem as customer-validated or quantify its impact.
3. **Differentiation risk:** Grammarly, Frontify, Writer, and Bynder publicly describe overlapping capabilities. Do not claim BrandGuard is the first, only, or uniquely comprehensive brand-governance or brand-compliance product. Potentially narrower differences—versioned approved facts, match-level certainty labels, affected registered-content views, and explicit tests for rule ambiguity—are hypotheses to compare, not established competitive gaps.
4. **Coverage risk:** “blast radius” can sound organization-wide. The project docs limit scans to registered content; do not imply detection of unregistered or inaccessible assets.
5. **Evidence/accuracy risk:** demo data, heuristic fallbacks, and a fictional labelled set do not establish production accuracy or generalize to real organizations. The disclosure says the evaluation script measures results on fictional labelled data; cite actual run results and dataset limitations if reporting them.
6. **Certainty-label risk:** “confirmed” must remain scoped to a deterministic rule match and its specified inputs. It must not be presented as confirmation of legal exposure, factual truth, or the real-world significance of a match without suitable evidence and human review.
7. **Rule-test interpretation risk:** reader agreement is not a validated measure of rule quality or correctness. Treat it as a prompt for human review unless tested against suitable human-labelled cases.
8. **Competitor-source limitation:** the feature comparison is based on vendor-authored public pages, which may be selective, promotional, changing, or plan-dependent. It does not establish feature availability, comparative performance, or feature absence.
9. **Human-control and external-service claims:** project [disclosure](disclosure.md) says AI calls can send content and fact/rule context to OpenAI when configured (reviewed 2026-11-04). Keep the data-flow and demo/AI-mode disclosures accurate; never imply human review is a substitute for privacy or security review.

## Sources and access

Competitor feature statements and exact official-page URLs, with access date, are recorded in [Competitor review](research/competitor-review.md). Project-specific statements above link to the local repository documents from which they were read; repository URLs could not be verified as publicly accessible during this review, so these internal references are not public-market evidence.
