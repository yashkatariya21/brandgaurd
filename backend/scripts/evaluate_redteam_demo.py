"""Evaluate grounded, deterministic demo persona output on synthetic cases.

Run from backend: python -m scripts.evaluate_redteam_demo
No provider, database, repeated-run stability, or semantic correctness is measured.
"""
import json
from pathlib import Path

from app.services.grounding import ground_runs
from app.services.redteam import PERSONAS, _run_persona

ROOT = Path(__file__).resolve().parents[1]
CASES = ROOT / 'tests' / 'data' / 'redteam_demo_cases.json'
REPORT = ROOT / 'redteam_demo_eval_report.json'


def evaluate(cases):
    personas = {persona['name']: persona for persona in PERSONAS}
    result = {}
    for case in cases:
        persona = personas[case['persona']]
        text = case['text']
        raw = [{**finding, 'persona': persona['name']} for finding in
               _run_persona(persona, text, '[]', '[]', False, 'fixture-version')]
        grounded, dropped, total = ground_runs([raw], text, 'fixture-version', {})
        detected = bool(grounded)
        expected = case['expected_flag']
        key = 'tp' if detected and expected else 'fp' if detected else 'fn' if expected else 'tn'
        row = result.setdefault(persona['name'], {'tp': 0, 'fp': 0, 'tn': 0, 'fn': 0,
                                                   'raw_findings': 0, 'grounding_drops': 0,
                                                   'missed_ids': [], 'false_positive_ids': []})
        row[key] += 1
        row['raw_findings'] += total
        row['grounding_drops'] += len(dropped)
        if key == 'fn': row['missed_ids'].append(case['id'])
        if key == 'fp': row['false_positive_ids'].append(case['id'])
    for row in result.values():
        tp, fp, tn, fn = (row[k] for k in ('tp', 'fp', 'tn', 'fn'))
        row['precision'] = tp / (tp + fp) if tp + fp else None
        row['recall'] = tp / (tp + fn) if tp + fn else None
        row['false_positive_rate'] = fp / (fp + tn) if fp + tn else None
    return result


def main():
    fixture = json.loads(CASES.read_text())
    report = {'label_review': fixture['label_review'], 'n': len(fixture['cases']),
              'mode': 'deterministic demo',
              'scope': 'One target persona per case, single deterministic run, empty fact/rule catalogue. Measures whether any grounded finding is emitted, not correctness of its rationale.',
              'limitations': 'AI-generated synthetic labels are unreviewed; cases are not independent or representative. No real-world accuracy, repeat-run reliability, live provider, database or tenant-isolation measurement.',
              'personas': evaluate(fixture['cases'])}
    REPORT.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
