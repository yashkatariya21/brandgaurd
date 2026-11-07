# BrandGuard — judge Q&A and limitations (Round 2)

Use the short answers as written unless the running product provides stronger verified evidence. The demo uses fictional NimbusDesk data. No runtime, test, or evaluation result was independently checked while preparing this document.

## Hard judge questions

### “What exactly have you built?”

“This Round 2 prototype has three connected slices: **Brand-as-Code with Blast-Radius Intelligence** for versioned facts and affected-content scans; **Adversarial Brand Red Team** with three persona perspectives and a separate human decision; and **Guideline Chaos Testing** for tone-rule cases and ambiguity signals. The scan covers content records in the workspace, not every place the brand appears online.”

### “How does BrandGuard know something is actually wrong?”

“We separate deterministic checks from judgement. A confirmed blast-radius match is based on the extracted value and its matching attribute, or an existing claim link to the fact. A numeric match with unclear or different context is possible and asks for human review. Persona findings remain possible. These labels describe the evidence path; they are not a guarantee of truth.”

### “What do the five interpretations represent? Are they independent?”

“They are five interpretations configured for one rule test, not five independent models or human experts. In the no-key demo mode they are lightweight heuristics. With the LLM path, prompts and temperatures vary, but the interpretations use the same provider/model family and can share biases. Agreement measures consistency among these interpretations, not correctness.”

### “Can your AI approve content or make the change?”

“No. A person separately records a finding decision. A suggested edit is not applied to the content and the product does not publish. Accepting a Chaos ambiguity issue resolves that issue record; it does not rewrite the rule.”

### “Does the blast-radius feature find all brand mentions on the internet?”

“No. It examines the content currently registered in this BrandGuard organisation. Unregistered pages, third-party channels, and content that was never ingested are outside the scan. The result includes a scope note for that reason.”

### “Is it a real dependency graph?”

“Not in the Round 2 demo. This slice versions facts and computes an affected-content list. We do not claim a fully exposed dependency graph.”

### “Can you give us accuracy or precision numbers?”

“We are not presenting a measured accuracy claim. There is a script intended to measure blast-radius matching on a small, hand-labelled fictional NimbusDesk set, but those numbers have not been independently run and checked for this presentation. That set would not establish generalisation to real brands or content.”

### “What happens when OpenAI is unavailable?”

“The application has a clearly labelled no-key heuristic demo mode. That is separate from live-mode error handling, which is not uniform: Chaos Testing may substitute stub cases or borderline verdicts while still reporting LLM mode; Red Team can return a parse-error finding; and debate can surface failed-call text. The current Compose configuration also does not pass the OpenAI key/model to the backend. We use only a prepared and rehearsed configuration, disclose a live failure, and skip that AI-dependent step rather than imply transparent failover.”

### “Are the Legal Eagle results legal advice?”

“No. They are possible risk perspectives, not legal advice or a substitute for counsel. The UI attaches that qualification to Legal Eagle findings.”

### “Is the Content Passport C2PA-compliant?”

“No. BrandGuard is not C2PA-conformant. Do not present a future or C2PA-inspired passport concept as delivered compliance or proof that content is true.”

### “What customer data goes to a model?”

“In the current documented LLM path, submitted content text and relevant approved fact/rule context may be sent to the configured OpenAI API; Chaos Testing sends rule/case text. The demo content is fictional NimbusDesk data. We would not put real customer or confidential content into the demo. Before any real deployment, the organisation must assess provider terms, privacy, retention, consent, and data-handling requirements.”

### “What is not working or verified yet?”

“The frontend build and lint, selected database-independent backend tests, Compose configuration, and a 20-case fictional evaluation ran locally. Docker was unavailable, so we could not start PostgreSQL or the API, run database-backed tests, or rehearse the full browser workflow. CI and live OpenAI calls were not run, and independent QA sign-off is still pending. We will not claim those checks passed.”

## Limitations statement (spoken or slide-ready)

> BrandGuard only analyses content registered in the current organisation; it does not discover or scan all external/publication channels. Its LLM personas share provider/model and prompt biases, and their outputs are possibilities for human review—not independent expert opinions or factual proof. The no-key demo uses heuristics, not AI. Provider failures are labelled as demo or mixed output in source; live failure behavior remains unverified. Agreement between interpreters is not correctness. BrandGuard is not legal advice, and it is not C2PA-conformant. It does not publish content or automatically apply a correction. No general accuracy, production-readiness, or performance claim is made from the evidence available for this demo.

## Presentation guardrails

- Keep all three improvement names exact:
  1. **Brand-as-Code with Blast-Radius Intelligence**
  2. **Adversarial Brand Red Team**
  3. **Guideline Chaos Testing**
- State **Confirmed** vs **Possible** accurately; do not promote model opinion or heuristic output to Confirmed.
- Show the actual mode badge and actual result. Demo heuristic output is never described as live AI output.
- Do not imply that five interpretations are five independent models/people.
- Do not claim C2PA conformance, legal advice, full-web coverage, or auto-remediation.
- Keep any future capabilities clearly labelled roadmap. Round 3 is not part of this pitch’s claimed delivery.
- No tests, builds, live model calls, measured timings, or measured accuracy figures were verified for this documentation pass.
