# BrandGuard — Round 2 demo (about 5 minutes)

**Purpose:** show three implemented Round 2 improvements in the fictional NimbusDesk workspace: a versioned fact change and impact scan; persona-based adversarial review with a person deciding; and a tone-rule ambiguity test. This is a source-checked walkthrough, not a claim that the current checkout has been runtime-tested.

## Before the room

1. Use a disposable demo environment with the backend, PostgreSQL, and frontend running; the Compose stack exposes the UI at `http://localhost:3000`. Fill the required database/JWT variables in `.env`, including a `SEED_PASSWORD` of at least 10 characters. Keep credentials private; enter the actual configured password at login rather than treating `$SEED_PASSWORD` as a literal password.
2. Ensure the fictional NimbusDesk seed exists and is in its initial state. The seed includes 16 facts, 15 rules, 12 registered content assets, and six role accounts. Do not reset a shared or valuable database during a presentation.
3. Use **two isolated browser profiles** (for example, a normal window and a private window), not two tabs in one profile: the app stores its auth token in shared browser local storage. Sign in to organisation `nimbusdesk` as `brand@nimbusdesk.example` (Brand Manager) in one profile and `approver@nimbusdesk.example` (Approver) in the other, using the configured seed password. Confirm that both profiles show real workspace data; API-backed pages need the live service and seeded data.
4. Recommended presentation mode: use the default Compose backend with **no `OPENAI_API_KEY`** so the AI-labelled features visibly identify themselves as heuristic demo mode. The Compose file does not forward the key/model to the backend, so placing a key in `.env` alone does not enable live LLM mode. This no-key path avoids dependence on an external LLM and makes the sample outputs more predictable. Do not describe those outputs as AI-generated. If you separately configure a local/live-LLM backend, rehearse it against that actual API and do not promise exact findings, case counts, or response time.
5. Keep the two named accounts open, and start from the initial seed state. If the count is already changed, use a fresh disposable database prepared before the demo; don't improvise a destructive reset in front of judges.

## Run of show

### 0:00–0:25 — Set the frame

**Say:** “BrandGuard checks content against a governed set of approved facts and rules. Today I’ll show three Round 2 slices. The workspace is fictional NimbusDesk data. A scan only covers content registered here; it does not crawl the public web.”

### 0:25–1:45 — Improvement 1: Brand-as-Code with Blast-Radius Intelligence

1. In the Brand Manager profile, open **Repository → Facts → Customer count**.
2. The seed has v1 (`50,000+ customers`, approved) and v2 (`65,000+ customers`, draft). On v2, click **Submit for approval**. The UI calls `factsApi.submitVersion`, which uses the implemented submit endpoint to move the draft to pending approval.
3. In the isolated Approver profile, refresh/open the same fact and approve the pending v2. This changes the current approved fact only after the approver acts.
4. Return to the Brand Manager profile, open **Blast Radius**, select `Customer count (customer_count)`, and run the scan.
5. Point out the Confirmed and Possible groups and the scope note. In the seeded assets, the source-level acceptance cases expect **A-01, A-03, A-04, A-06** as confirmed and **A-05** (“50,000 tickets”) as possible; A-05 is a numeric match with a different attribute. If the live result differs, report what the screen actually shows—do not substitute the expected list.

**Say:** “Confirmed here means the deterministic value-and-attribute check matched; Possible means a human must verify the context. The scan lists affected registered assets, but it does not edit or publish anything.”

**Important precision:** This Round 2 slice is versioned facts plus a computed affected-content list. Do not claim the product currently exposes a full dependency graph.

### 1:45–3:25 — Improvement 2: Adversarial Brand Red Team

1. In the Brand Manager profile, open **Content → New Content**. Create a temporary item with a clear title such as “Demo risk copy” and this fictional body:

   `Guaranteed 100% uptime. ISO 27001 certified. Project Heron launches Q1.`

   Submit it, open the new item, and select **Run Red Team**. The submit-content permission includes the Brand Manager role.
2. In demo mode, point out that the UI marks the findings as **Possible** and shows the demo-mode notice. The heuristic stub is designed to flag guarantee language, the unsupported ISO claim, and the embargoed Project Heron term; show only findings that actually appear.
3. Go to **Findings**, locate an open finding, and choose **Show debate**. Point to Prosecutor, Defender, and the suggested edit. In demo mode, the arguments are canned heuristic fallback text, not contextual AI reasoning.
4. Close the debate panel, return to that finding’s row, and separately select **Decide**. Choose an action and save it. The decision is recorded for the finding; no correction is applied to the content and nothing is published. If you use “Dismiss,” the UI requires a reason.

**Say:** “The three named personas are Brand Police, Legal Eagle, and Customer Voice. Persona output is a possible risk for human review, not proof or a verdict. The debate shows two sides; the human decision is a separate action.”

**Live-LLM caution:** with a key, findings and arguments can vary. There is no uniform, transparently labelled outage fallback: Chaos Testing can fall back to stub cases or borderline verdicts while the run still reports LLM mode; Red Team can return a parse-error finding; and debate can surface failed-call text. If a live request fails, disclose it and do not treat the mode badge alone as proof every output came from a successful model call.

### 3:25–4:40 — Improvement 3: Guideline Chaos Testing

1. Open **Rule Tests** and choose **R-01 – Friendly and professional tone**. Round 2 exposes tone rules only.
2. Run the test. In the no-key demo path, the source uses 12 fixed cases and five lightweight heuristic interpretations per case. The page labels demo mode; describe these as **five heuristic interpretations**, not independent AI models.
3. Find the case **“Great news! Your order has shipped.”** in the no-key sample. The demo heuristic is designed to split on it. Point out its intended label, the recorded verdicts, and the ambiguity flag. Say that the score represents agreement among these configured interpreters, not correctness or evidence that the rule is objectively unclear.
4. If time permits, assign a human label to one case and accept an ambiguity issue. Explain exactly what these controls do: the label records a reviewer annotation; accepting an issue resolves that issue. It does **not** rewrite or publish a changed rule.

**Say:** “This tests where a tone rule may need clarification. It is not a general test suite for all rule categories, and a human annotation is not automatically objective ground truth.”

### 4:40–5:00 — Close

**Say:** “The common thread is traceability and human control: a fact change surfaces registered content, risk perspectives stay possible, and a person records the decision. Coverage is limited to content registered in the workspace; this is not legal advice and the Content Passport is not C2PA-conformant.”

## Contingencies (do not fake results)

- **API/database/UI unavailable:** stop the live flow and state the blocker. Switch to a prepared, isolated, already-verified environment only if one is actually available; otherwise give a verbal walkthrough and label it unverified.
- **Live LLM call fails:** report the failure. Fallback behavior is feature-specific and not uniformly labelled: Chaos can use heuristic substitutions under an LLM-mode run, while Red Team/debate may surface errors. A no-key demo-mode backend is a planned alternative only if it was prepared and rehearsed beforehand; changing configuration and restarting is not an instant in-product toggle. If that environment is not ready, skip the AI-dependent part and show only a working deterministic flow.
- **A finding or expected sample differs:** show the actual result and explain that heuristic and LLM output can vary. Never invent or paste a result that was not produced by the running app.
- **Already-mutated seed data:** don't reset during judging. Start with a separately prepared disposable seeded database or adapt the walkthrough to the current data and explicitly identify the deviation.
- **Timing:** omit the optional decision or case-label clicks before cutting either of the other named improvements. Keep all three improvements represented.

## Claims verified against source; not runtime-verified here

- The seed defines the two NimbusDesk roles and a draft v2 customer count; the UI submit action calls the submit-version API, which moves a draft to pending approval, and the approver can approve it.
- The blast-radius endpoint scans the organisation’s registered content, separates confirmed from possible matches, persists the result, and returns a registered-content scope note.
- Red Team uses three fixed persona names; persona findings are saved as `possible`; debate stores two arguments and no AI verdict; a separate endpoint records the human decision.
- Tone-only Chaos Testing uses five interpretations per case, supports case labels and ambiguity-issue resolution, and has a demo heuristic path.
- No live application, database, browser flow, or test command was run to validate this walkthrough during this documentation update.
