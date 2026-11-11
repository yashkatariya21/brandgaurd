from datetime import date
from app.services.checker_chaos import product_name_cases, embargo_cases


def test_seeded_explicit_product_name_miss_is_detected():
    cases = product_name_cases()
    miss = next(c for c in cases if c['text'] == 'Nimbus helps teams.')
    assert miss['intended_label'] == 'fail' and miss['checker_miss']
    assert not next(c for c in cases if c['text'] == 'Nimbus Desk helps teams.')['checker_miss']
    assert not next(c for c in cases if c['text'] == 'NimbusDesk helps teams.')['false_positive']
    assert not any(c['checker_miss'] for c in cases if c['intended_label'] == 'borderline')


def test_embargo_cases_use_real_active_term_and_date():
    assert embargo_cases([{'term':'Project Heron','embargo_until':date(2026, 1, 1)}], date(2026, 1, 1)) == []
    cases = embargo_cases([{'term':'Project Heron','embargo_until':date(2026, 12, 1)}], date(2026, 11, 11))
    assert len(cases) == 3 and not any(c['checker_miss'] or c['false_positive'] for c in cases)
