# BrandGuard – 5-Minute Demo Script (Round 2)

**Personas needed:** Two browser tabs — one logged in as Brand Manager (`brand@nimbusdesk.example`), one as Approver (`approver@nimbusdesk.example`). Password = `$SEED_PASSWORD`.

---

## Part 1 – Blast Radius with Confirmed + Possible (2 min)

### Step 1: Approve the new fact value (Brand Manager tab)
1. Open **Repository** → click `customer_count` fact
2. Version history shows **v1: "50,000+ customers" (approved)** and **v2: "65,000+ customers" (draft)**
3. Click **Submit** on v2 to send for approval
4. Switch to **Approver tab** → open Repository → `customer_count` → click **Approve** on v2
5. Say: *"The fact is now approved. 65,000+ customers is the official value."*

### Step 2: Run Blast Radius (Brand Manager tab)
1. Open **Blast Radius** page
2. Select `Customer count (customer_count)` → click **Run Blast Radius Scan**
3. Results appear in ~1 second

**What to point out:**
- Summary shows **Confirmed** count (red) and **Possible** count (amber)
- Confirmed items: A-01, A-03, A-04, A-06 — these definitely say "50,000 customers" (or equivalent) and must be updated
- Possible item: A-05 — "50,000 tickets" — the number matches but it's about ticket volume, not customer count. *Human review needed.*
- Scope note: "Only content registered in BrandGuard was scanned."
- **Nothing is changed automatically.** The content team now knows what to fix.

---

## Part 2 – Red Team + Prosecutor vs Defender (2 min)

### Step 1: Run Red Team on a risky draft
1. Open **Content** page
2. Click on the content item **A-12 "Uptime copy draft"** (or any item, or submit a new one with text: `"Guaranteed 100% uptime. ISO 27001 certified. Project Heron launches Q1."`)
3. Click **🎯 Run Red Team**
4. Three persona findings appear:
   - **Brand Police**: brand voice / naming issues
   - **Legal Eagle**: guarantee language, false cert claim, embargo (carries "AI risk perspective, not legal advice")
   - **Customer Voice**: trust and credibility concerns
5. Demo mode badge appears if no `OPENAI_API_KEY` set — *"These are heuristic checks, clearly labelled."*

### Step 2: Open the debate on a finding
1. Go to **Findings** page
2. Find a red team finding (amber "Possible · Legal Eagle" badge)
3. Click **Show debate**
4. Two-column panel opens:
   - **⚖️ Prosecutor** (red): the case for fixing it
   - **🛡️ Defender** (green): the case against
   - Suggested minimal edit shown below
   - Footer: *"Both arguments are shown so a person can decide. Neither is a verdict."*
5. Click **Decide** → choose Accept or Dismiss with reason
6. Say: *"The AI presented both sides. A human just made the decision."*

---

## Part 3 – Chaos Testing a tone rule (1 min)

### Step 1: Run the test
1. Open **Rule Tests** page
2. Select **R-01 – Friendly and professional tone** (or R-14 Plain language)
3. Click **Run Test**
4. Table appears with 12 cases: ~4 pass, ~4 fail, ~4 borderline

### Step 2: Show ambiguity
1. Point to a **green "Rule is clear here"** row — the 5 readers agreed unanimously
2. Point to an **amber "Ambiguous – human label needed"** row (e.g. "Great news! Your order has shipped.")
3. Say: *"The readers split on this case. That tells us the rule is ambiguous here — not that the content is wrong."*
4. An **Ambiguity Issue** card appears at the top with a suggested clarification
5. Click **Accept clarification** — the card turns green
6. Label a borderline case (e.g. "Hi there :) Your invoice is attached.") → click **borderline**
7. Say: *"Human labels are ground truth. The AI agreement score just flags where the rule needs work."*

**Demo mode note:** If no API key, show the amber "Demo mode" banner — *"5 lightweight heuristics, clearly labelled. Real AI readers work the same way when the key is set."*

---

## Key messages to emphasise

- **Confirmed vs Possible** — BrandGuard never calls an AI opinion "confirmed". Confirmed = deterministic proof.
- **Human decides** — every action (update content, accept finding, resolve debate) requires a human.
- **Demo mode works** — the full flow runs without an OpenAI key, clearly labelled.
- **Scope is honest** — "Only content registered in BrandGuard was scanned."
