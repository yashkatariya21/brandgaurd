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


def test_human_diff_tracks_labels_axis_and_nulls_without_checker_verdicts():
    from app.services.chaos_regression import compare_human_review_cases
    old = [{'text':'same', 'axis':'source_example', 'intended_label':'pass', 'human_label':None},
           {'text':'old', 'axis':'case_variant', 'intended_label':'borderline', 'human_label':'fail'}]
    new = [{'text':'same', 'axis':'source_example', 'intended_label':'pass', 'human_label':'fail'},
           {'text':'new', 'axis':'case_variant', 'intended_label':'borderline', 'human_label':None}]
    result = compare_human_review_cases(old, new)
    assert result['changed'][0]['before']['human_label'] is None
    assert result['changed'][0]['after']['human_label'] == 'fail'
    assert result['added'][0]['text'] == 'new' and result['removed'][0]['text'] == 'old'
    assert result['unchanged'] == 0


def test_human_diff_rejects_duplicate_text():
    from app.services.chaos_regression import compare_human_review_cases
    row = {'text':'same', 'axis':'source_example', 'intended_label':'pass', 'human_label':None}
    with pytest.raises(ValueError):
        compare_human_review_cases([row, row], [])
