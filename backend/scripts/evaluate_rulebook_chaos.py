"""Evaluate two shared checker predicates on synthetic, unreviewed cases.

Run from backend: python -m scripts.evaluate_rulebook_chaos
This does not execute the database-backed checker or evaluate other rule families.
"""
import json
from datetime import date
from pathlib import Path

from app.services.checker_chaos import observed_product_name_violation, is_active_embargo_mentioned

ROOT = Path(__file__).resolve().parents[1]
CASES = ROOT / 'tests' / 'data' / 'rulebook_faults.json'
REPORT = ROOT / 'rulebook_chaos_eval_report.json'


def evaluate(cases):
    results = {}
    for case in cases:
        family = case['family']
        if family == 'product_name':
            found = observed_product_name_violation(case['text'])
        elif family == 'embargo':
            found = is_active_embargo_mentioned(case['text'], 'Project Heron', date(2027, 1, 1), date(2026, 11, 11))
        else:
            raise ValueError(f'Unknown family: {family}')
        counts = results.setdefault(family, {'tp': 0, 'fp': 0, 'tn': 0, 'fn': 0, 'missed_ids': [], 'false_positive_ids': []})
        expected = case['expected_flag']
        key = 'tp' if found and expected else 'fp' if found else 'fn' if expected else 'tn'
        counts[key] += 1
        if key == 'fn': counts['missed_ids'].append(case['id'])
        if key == 'fp': counts['false_positive_ids'].append(case['id'])
    for counts in results.values():
        tp, fp, tn, fn = (counts[k] for k in ('tp', 'fp', 'tn', 'fn'))
        counts['precision'] = tp / (tp + fp) if tp + fp else None
        counts['recall'] = tp / (tp + fn) if tp + fn else None
        counts['false_positive_rate'] = fp / (fp + tn) if fp + tn else None
    return results


def main():
    fixture = json.loads(CASES.read_text())
    report = {'label_review': fixture['label_review'], 'n': len(fixture['cases']),
              'scope': 'Shared product-name and active-embargo predicates only; not an end-to-end checker test.',
              'limitations': 'AI-generated synthetic labels are unreviewed; cases and detector were developed together. Human review required; no real-world accuracy claim.',
              'families': evaluate(fixture['cases'])}
    REPORT.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
