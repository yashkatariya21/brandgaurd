"""Evaluate offline character similarity using an unreviewed synthetic fixture.

Run from backend: python -m scripts.evaluate_graph_similarity [--target-precision 0.85]
Development examples determine the threshold; holdout examples are evaluated
only after selection. Neither subset establishes real-world performance.
"""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from app.services.dependency_graph import local_similarity

CASES = Path(__file__).resolve().parents[1] / 'tests' / 'data' / 'graph_similarity_cases.json'
REPORT = Path(__file__).resolve().parents[1] / 'graph_eval_report.json'
THRESHOLDS = tuple(round(0.30 + index * 0.05, 2) for index in range(11))


def evaluate(cases, threshold):
    if not 0 <= threshold <= 1:
        raise ValueError('threshold must be between zero and one')
    outcomes = {'tp': 0, 'fp': 0, 'tn': 0, 'fn': 0}
    for case in cases:
        hit = local_similarity(case['fact'], case['claim']) >= threshold
        expected = case['related']
        outcomes['tp' if hit and expected else 'fp' if hit else 'fn' if expected else 'tn'] += 1
    tp, fp, tn, fn = (outcomes[k] for k in ('tp', 'fp', 'tn', 'fn'))
    outcomes['precision'] = tp / (tp + fp) if tp + fp else None
    outcomes['recall'] = tp / (tp + fn) if tp + fn else None
    outcomes['false_positive_rate'] = fp / (fp + tn) if fp + tn else None
    return outcomes


def calibrate(cases, target_precision=0.85):
    if not 0 < target_precision <= 1:
        raise ValueError('target precision must be greater than zero and at most one')
    development = [row for row in cases if row['split'] == 'development']
    if not development:
        raise ValueError('development cases are required')
    metrics = [(threshold, evaluate(development, threshold)) for threshold in THRESHOLDS]
    eligible = [threshold for threshold, values in metrics
                if values['precision'] is not None and values['precision'] >= target_precision]
    return (eligible[0] if eligible else THRESHOLDS[-1]), bool(eligible), metrics


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target-precision', type=float, default=0.85)
    parser.add_argument('--output', type=Path, default=REPORT)
    args = parser.parse_args()
    fixture = json.loads(CASES.read_text())
    cases = fixture['cases']
    dev = [case for case in cases if case['split'] == 'development']
    holdout = [case for case in cases if case['split'] == 'holdout']
    threshold, target_met, rows = calibrate(dev, args.target_precision)
    print('Synthetic AI-generated fixture; labels unreviewed; offline character similarity, not embeddings.')
    print('Development threshold | precision | recall | false-positive rate')
    for value, metric in rows:
        def pct(x): return 'not applicable' if x is None else f'{x:.2%}'
        print(f"{value:.2f} | {pct(metric['precision'])} | {pct(metric['recall'])} | {pct(metric['false_positive_rate'])}")
    holdout_metrics = evaluate(holdout, threshold)
    dev_metrics = evaluate(dev, threshold)
    print(f'Selected {threshold:.2f}; target met on development: {target_met}')
    if not target_met: print('Target precision not met; using the highest tested threshold as a conservative fallback.')
    print(f'Holdout (n={len(holdout)}): {holdout_metrics}')
    report = {'date': datetime.now(timezone.utc).date().isoformat(), 'n_dev': len(dev), 'n_holdout': len(holdout),
              'threshold': threshold, 'target_precision': args.target_precision, 'target_met': target_met,
              'dev_metrics': dev_metrics, 'holdout_metrics': holdout_metrics,
              'fixture_note': 'AI-generated synthetic examples; labels unreviewed and not evidence of real-world accuracy. An earlier holdout evaluation preceded removal of three overlapping dev/holdout examples; holdout is not pristine.'}
    args.output.write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
