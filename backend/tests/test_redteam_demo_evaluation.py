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


def test_report_endpoint_handles_missing_and_invalid_report(monkeypatch, tmp_path):
    from app.api import redteam
    path = tmp_path / 'report.json'
    monkeypatch.setattr(redteam, 'DEMO_EVAL_REPORT', path)
    assert redteam.redteam_demo_evaluation(principal=None)['available'] is False
    path.write_text('invalid json')
    assert redteam.redteam_demo_evaluation(principal=None)['available'] is False
    path.write_text(json.dumps({'mode': 'deterministic demo', 'personas': {}}))
    output = redteam.redteam_demo_evaluation(principal=None)
    assert output['available'] and 'not live telemetry' in output['note']
