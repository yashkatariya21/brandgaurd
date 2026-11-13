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


def test_calibration_uses_development_only():
    from scripts.evaluate_graph_similarity import calibrate
    cases = json.loads(CASES.read_text())['cases']
    threshold, met, measurements = calibrate(cases)
    changed_holdout = [dict(c, related=not c['related']) if c['split'] == 'holdout' else c for c in cases]
    assert calibrate(changed_holdout) == (threshold, met, measurements)


def test_no_exact_dev_holdout_pair_overlap():
    cases = json.loads(CASES.read_text())['cases']
    dev = {(c['fact'], c['claim']) for c in cases if c['split'] == 'development'}
    holdout = {(c['fact'], c['claim']) for c in cases if c['split'] == 'holdout'}
    assert not dev & holdout
