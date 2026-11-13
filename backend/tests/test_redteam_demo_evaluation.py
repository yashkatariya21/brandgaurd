import json
from scripts.evaluate_redteam_demo import CASES, evaluate


def test_synthetic_fixture_is_unreviewed_and_covers_personas():
    fixture = json.loads(CASES.read_text())
    cases = fixture['cases']
    assert fixture['label_review'] == 'unreviewed'
    assert len(cases) >= 40 and len({case['id'] for case in cases}) == len(cases)
    for persona in ('Brand Police', 'Legal Eagle', 'Customer Voice', 'Competitor Watch'):
        assert {case['expected_flag'] for case in cases if case['persona'] == persona} == {True, False}


def test_evaluation_counts_cases_and_grounding_drops():
    cases = json.loads(CASES.read_text())['cases']
    result = evaluate(cases)
    assert sum(sum(row[k] for k in ('tp', 'fp', 'tn', 'fn')) for row in result.values()) == len(cases)
    assert all(row['grounding_drops'] <= row['raw_findings'] for row in result.values())
    assert result['Competitor Watch']['tp'] > 0
