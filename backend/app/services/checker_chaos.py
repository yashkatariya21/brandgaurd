"""Adversarial tests for the checks actually present in the production checker.

Expected labels are supplied only where the seed rule explicitly covers the
case. Borderline transformations are not counted as confirmed misses.
"""
from datetime import date
from .claim_extractor import extract_claims


def is_banned_product_claim(claim: dict) -> bool:
    return claim.get('entity') == 'product_name' and claim.get('attribute') == 'banned_product_name'


def observed_product_name_violation(text: str) -> bool:
    return any(is_banned_product_claim(c) for c in extract_claims(text))


def product_name_cases() -> list[dict]:
    rows = [
        ('NimbusDesk helps teams.', 'pass', 'approved spelling'),
        ('Nimbus Desk helps teams.', 'fail', 'explicitly banned spelling'),
        ('NimbusDESK helps teams.', 'fail', 'explicitly banned casing'),
        ('Nimbus helps teams.', 'fail', 'explicitly banned short form'),
        ('Nimbus  Desk helps teams.', 'fail', 'spacing variant of banned form'),
        ('Nimbus-Desk helps teams.', 'borderline', 'hyphenation needs human interpretation'),
        ('Nimbus\u200bDesk helps teams.', 'borderline', 'zero-width variant needs human interpretation'),
    ]
    return [make_case(text, label, observed_product_name_violation(text), explanation) for text, label, explanation in rows]


def is_active_embargo_mentioned(text: str, term: str, until: date | None, today: date) -> bool:
    return bool(term and until and today < until and term.lower() in text.lower())


def embargo_cases(terms: list[dict], today: date) -> list[dict]:
    """Exercise every active term with the production check's literal matching.

    Case texts are unique for persisted regression comparison. A candidate is
    labelled pass only if it contains none of the active terms.
    """
    active = sorted((t for t in terms if t.get('term') and t.get('embargo_until')
                     and today < t['embargo_until']), key=lambda t: (t['term'].casefold(), t['term']))
    if not active:
        return []

    def observes(text):
        return any(is_active_embargo_mentioned(text, t['term'], t['embargo_until'], today) for t in active)

    rows = []
    seen = set()
    for item in active:
        term = item['term']
        for text, reason in [(f'Our launch uses {term}.', 'active embargo term'),
                             (f'Our launch uses {term.upper()}.', 'case variant')]:
            if text not in seen:
                seen.add(text)
                rows.append(make_case(text, 'fail', observes(text), reason))

    # In a tenant with unusually broad terms, even a neutral phrase can be
    # embargoed. Omit the negative control rather than mislabelling it.
    for text in ('A future release is planned.', 'Updates will follow.', 'Hello.'):
        if text not in seen and not observes(text):
            rows.append(make_case(text, 'pass', False, 'no active embargo term'))
            break
    return rows


def make_case(text: str, expected: str, flagged: bool, rationale: str) -> dict:
    observed = 'fail' if flagged else 'pass'
    return {'text': text, 'intended_label': expected, 'observed': observed,
            'checker_miss': expected == 'fail' and not flagged,
            'false_positive': expected == 'pass' and flagged, 'rationale': rationale}
