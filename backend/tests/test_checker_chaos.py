from datetime import date
from app.services.checker_chaos import product_name_cases, embargo_cases


def test_seeded_explicit_product_name_cases_are_detected():
    cases = product_name_cases()
    miss = next(c for c in cases if c['text'] == 'Nimbus helps teams.')
    assert miss['intended_label'] == 'fail' and not miss['checker_miss']
    assert not next(c for c in cases if c['text'] == 'Nimbus  Desk helps teams.')['checker_miss']
    assert not next(c for c in cases if c['text'] == 'Nimbus Desk helps teams.')['checker_miss']
    assert not next(c for c in cases if c['text'] == 'NimbusDesk helps teams.')['false_positive']
    assert all(c['observed'] == 'pass' for c in cases if c['intended_label'] == 'borderline')


def test_embargo_cases_use_real_active_term_and_date():
    assert embargo_cases([{'term':'Project Heron','embargo_until':date(2026, 1, 1)}], date(2026, 1, 1)) == []
    cases = embargo_cases([{'term':'Project Heron','embargo_until':date(2026, 12, 1)}], date(2026, 11, 11))
    assert len(cases) == 3 and not any(c['checker_miss'] or c['false_positive'] for c in cases)


def test_multiple_active_embargo_terms_are_all_tested_and_sorted():
    terms = [{'term': 'Zephyr', 'embargo_until': date(2027, 1, 1)},
             {'term': 'Alpha', 'embargo_until': date(2027, 1, 1)},
             {'term': 'Expired', 'embargo_until': date(2025, 1, 1)}]
    cases = embargo_cases(terms, date(2026, 1, 1))
    assert [case['text'] for case in cases] == [
        'Our launch uses Alpha.', 'Our launch uses ALPHA.',
        'Our launch uses Zephyr.', 'Our launch uses ZEPHYR.',
        'A future release is planned.']
    assert not any(c['checker_miss'] or c['false_positive'] for c in cases)
    assert cases == embargo_cases(list(reversed(terms)), date(2026, 1, 1))


def test_embargo_control_never_contains_an_active_term_and_cases_are_unique():
    terms = [{'term': term, 'embargo_until': date(2027, 1, 1)}
             for term in ['A', 'UPDATES', 'HELLO', 'A']]
    cases = embargo_cases(terms, date(2026, 1, 1))
    assert len({c['text'] for c in cases}) == len(cases)
    assert not any(c['intended_label'] == 'pass' for c in cases)
    assert not any(c['false_positive'] for c in cases)
