"""Evaluate the experimental local graph similarity, not semantic embeddings.

This synthetic fixture labels whether a short claim expresses the *same specific
fact/value*, rather than whether a topic might be worth human review. Scores are
not probabilities; the holdout was not used to tune the default threshold.
Run: python -m scripts.evaluate_graph_similarity [threshold]
"""
import json
import sys
from pathlib import Path

from app.services.dependency_graph import local_similarity

CASES = Path(__file__).resolve().parents[1] / 'tests' / 'data' / 'graph_similarity_cases.json'


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


def main():
    threshold = float(sys.argv[1]) if len(sys.argv) > 1 else 0.55
    cases = json.loads(CASES.read_text())
    print('Synthetic same-fact/value pairs; local character similarity only, not embeddings.')
    print('Threshold:', threshold)
    for split in ('development', 'holdout'):
        rows = [case for case in cases if case['split'] == split]
        print(f'{split} (n={len(rows)}): {evaluate(rows, threshold)}')
    print('Small AI-generated fixture; labels and generalisation require independent review.')


if __name__ == '__main__':
    main()
