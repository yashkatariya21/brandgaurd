# Human labels for Chaos Testing demo

Run Rule Tests on **R-01** (Friendly and professional tone).

After the run completes, locate these cases in the table and enter the human labels shown.
Use the Pass / Fail / Borderline buttons on the row.

| Case text (starts with) | Human label | Notes |
|---|---|---|
| "Great news! Your order has shipped." | pass | Exclamation mark is friendly — the heuristic may flag it as unprofessional |
| "We're happy to have you on board." | pass | Correct contraction use; heuristic may disagree |

After labelling, click **Accept clarification** on any open ambiguity issue.

## What to show the judges
1. The agreement score (shown as a percentage per case) — low agreement = the rule is ambiguous.
2. Two human labels override the majority heuristic verdict — this is the "human-in-the-loop" point.
3. The suggested clarification text that the system generates from the pattern of disagreement.
