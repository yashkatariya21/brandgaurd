import json
from scripts.evaluate_rulebook_chaos import CASES, evaluate


def test_fault_fixture_is_unreviewed_and_has_controls():
    fixture = json.loads(CASES.read_text())
    cases = fixture['cases']
    assert fixture['label_review'] == 'unreviewed'
    assert sum(c['expected_flag'] for c in cases) >= 30
    assert len({c['id'] for c in cases}) == len(cases)
    for family in ('product_name', 'embargo'):
        assert {c['expected_flag'] for c in cases if c['family'] == family} == {True, False}


def test_evaluation_counts_all_cases_and_uses_production_predicates():
    cases = json.loads(CASES.read_text())['cases']
    results = evaluate(cases)
    assert sum(sum(row[k] for k in ('tp', 'fp', 'tn', 'fn')) for row in results.values()) == len(cases)
    assert evaluate([{'id': 'x', 'family': 'product_name', 'text': 'Nimbus Desk helps.', 'expected_flag': True}])['product_name']['tp'] == 1
