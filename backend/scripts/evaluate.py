"""Evaluation script: measure blast-radius precision/recall on labelled_cases.json.

Usage:
    python -m scripts.evaluate

Runs purely on the claim extractor + blast-radius scan function (no DB, no LLM).
Prints precision, recall, and false-positive rate. Does NOT hard-code or commit any
claimed results.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Allow running from backend/ or repo root
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.blast_radius import _scan_item, _normalise_old_value

CASES_FILE = Path(__file__).resolve().parents[1] / "tests" / "data" / "labelled_cases.json"

# Blast-radius parameters for the demo (customer_count fact)
OLD_VALUE_TEXT   = "50,000+ customers"
OLD_VALUE_NUMBER = 50000.0
NEW_VALUE_TEXT   = "65,000+ customers"
FACT_ATTRIBUTE   = "customer_count"
FACT_ID          = "fact-customer-count-eval"


def main() -> None:
    cases = json.loads(CASES_FILE.read_text())

    # Blast-radius evaluation
    true_pos  = 0   # expected match, got match (confirmed or possible)
    true_neg  = 0   # expected none, got none
    false_pos = 0   # expected none, got match
    false_neg = 0   # expected match, got none

    confirmed_correct = 0
    confirmed_total   = 0
    possible_correct  = 0
    possible_total    = 0

    print(f"\n{'='*62}")
    print(f"{'ID':<8} {'Expected blast':<15} {'Got':<12} {'✓/✗'}")
    print(f"{'='*62}")

    for case in cases:
        cid     = case["id"]
        text    = case["text"]
        expected = case["expected_blast"]  # confirmed | possible | none

        result = _scan_item(
            text,
            OLD_VALUE_NUMBER,
            OLD_VALUE_TEXT,
            NEW_VALUE_TEXT,
            FACT_ATTRIBUTE,
            None,
            FACT_ID,
        )

        got = result["match_type"] if result else "none"
        expected_match = expected in ("confirmed", "possible")
        got_match      = got in ("confirmed", "possible")

        if expected_match and got_match:
            true_pos += 1
            mark = "✓"
        elif not expected_match and not got_match:
            true_neg += 1
            mark = "✓"
        elif not expected_match and got_match:
            false_pos += 1
            mark = "✗ FP"
        else:
            false_neg += 1
            mark = "✗ FN"

        # Label accuracy
        if expected == "confirmed":
            confirmed_total += 1
            if got == "confirmed":
                confirmed_correct += 1
        if expected == "possible":
            possible_total += 1
            if got == "possible":
                possible_correct += 1

        print(f"{cid:<8} {expected:<15} {got:<12} {mark}   {case.get('note','')[:30]}")

    total = len(cases)
    tp = true_pos
    fp = false_pos
    fn = false_neg
    tn = true_neg

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall    = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    fpr       = fp / (fp + tn) if (fp + tn) > 0 else 0.0

    print(f"\n{'='*62}")
    print(f"Blast-radius evaluation on {total} labelled cases")
    print(f"  True positives  : {tp}")
    print(f"  True negatives  : {tn}")
    print(f"  False positives : {fp}")
    print(f"  False negatives : {fn}")
    print(f"  Precision       : {precision:.2%}")
    print(f"  Recall          : {recall:.2%}")
    print(f"  False-pos rate  : {fpr:.2%}")

    if confirmed_total:
        print(f"\n  'confirmed' label accuracy : "
              f"{confirmed_correct}/{confirmed_total} "
              f"({confirmed_correct/confirmed_total:.0%})")
    if possible_total:
        print(f"  'possible'  label accuracy : "
              f"{possible_correct}/{possible_total} "
              f"({possible_correct/possible_total:.0%})")

    print(f"\n  Note: These numbers are measured on a {total}-item hand-labelled")
    print(f"  fictional NimbusDesk dataset. They reflect the deterministic")
    print(f"  claim extractor only (no LLM). Generalisation to real content")
    print(f"  has not been measured.")
    print(f"{'='*62}\n")


if __name__ == "__main__":
    main()
