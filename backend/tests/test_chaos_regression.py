import pytest
from app.services.chaos_regression import compare_checker_cases


def test_diff_uses_expected_and_observed_and_keeps_added_removed():
    old = [{'text': 'same', 'intended_label': 'pass', 'majority_verdict': 'pass'},
           {'text': 'change', 'intended_label': 'fail', 'majority_verdict': 'pass'},
           {'text': 'removed', 'intended_label': 'fail', 'majority_verdict': 'fail'}]
    new = [{'text': 'same', 'intended_label': 'pass', 'observed': 'pass'},
           {'text': 'change', 'intended_label': 'fail', 'observed': 'fail'},
           {'text': 'added', 'intended_label': 'borderline', 'observed': 'pass'}]
    diff = compare_checker_cases(old, new)
    assert diff['unchanged'] == 1
    assert diff['changed'][0]['before']['observed'] == 'pass'
    assert diff['changed'][0]['after']['observed'] == 'fail'
    assert [r['text'] for r in diff['added']] == ['added']
    assert [r['text'] for r in diff['removed']] == ['removed']


def test_duplicate_case_text_is_rejected():
    rows = [{'text': 'same', 'intended_label': 'pass', 'observed': 'pass'}] * 2
    with pytest.raises(ValueError):
        compare_checker_cases(rows, [])
