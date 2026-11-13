# Deterministic checker coverage

Source reviewed: `backend/app/services/checker.py`, `claim_extractor.py` and the shared predicates in `checker_chaos.py`. This describes source behavior, not independently verified correctness or coverage of a rulebook.

| Production check | Trigger and limitations | Rule association / family |
| --- | --- | --- |
| Active embargo term | Case-insensitive literal term in body; expiry date must be after today's date. | R-12 when present; embargo. |
| Banned product form | Extractor identifies certain hard-coded NimbusDesk banned spellings. | R-04 when present; terminology. |
| Banned alias | A previously extracted claim links to a fact through a matching alias marked banned. | R-04 when present; terminology. Link order matters. |
| Numeric value mismatch | A linked numeric claim differs from its linked current approved fact by over 5%. Links may be selected by entity, alias or a near numeric value. | R-07 when present; claims. The link is not proof of correct attribution. |
| Expired approved fact | A linked fact has an expiry date before today. | No specific rule is assigned by the check; fact validity. |
| Superseded numeric value | Extracted numeric claim equals a superseded fact value whose current numeric value differs. Returns Possible and requires human review. | No specific rule is assigned; fact validity. Numeric coincidence may be unrelated. |

The extractor recognizes selected numeric forms, certifications, product-name patterns and a literal embargo term, but extracting a certification does not itself establish a certification check. The checker does not implement a general accessibility, tone, absolute-claim, or all-rule-family evaluator. Rule association is by hard-coded key lookup, not a general interpretation of current rule text. See the review-case interface for human review where no machine check is available.
