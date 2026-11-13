import json
from scripts.evaluate_graph_similarity import CASES, evaluate


def test_fixture_splits_have_unique_ids_and_both_labels():
    cases = json.loads(CASES.read_text())['cases']
    assert len({c['id'] for c in cases}) == len(cases)
    for split in ('development', 'holdout'):
        assert {c['related'] for c in cases if c['split'] == split} == {True, False}


def test_evaluation_handles_empty_denominators_without_claiming_perfect_performance():
    result = evaluate([], .55)
    assert result['precision'] is None and result['recall'] is None
    assert result['false_positive_rate'] is None


def test_confusion_counts_cover_the_fixture():
    cases = json.loads(CASES.read_text())['cases']
    result = evaluate(cases, .55)
    assert sum(result[k] for k in ('tp', 'fp', 'tn', 'fn')) == len(cases)


def test_fixture_size_split_and_review_status():
    fixture = json.loads(CASES.read_text())
    cases = fixture['cases']
    assert fixture['label_review'] == 'unreviewed'
    assert len(cases) >= 150
    assert sum(not case['related'] for case in cases) / len(cases) >= 0.4
    assert sum(c['split'] == 'development' for c in cases) == 100
    assert sum(c['split'] == 'holdout' for c in cases) == 50
    assert all(c.get('paraphrase_type') for c in cases)
