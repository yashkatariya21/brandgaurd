"""Adversarial tests for the checks actually present in the production checker.

Expected labels are supplied only where the seed rule explicitly covers the
case. Borderline transformations are not counted as confirmed misses.
"""
from datetime import date
from .claim_extractor import extract_claims


def is_banned_product_claim(claim: dict) -> bool:
    raw = claim['raw_text'].lower()
    return claim.get('entity') == 'product_name' and ('nimbus desk' in raw or 'nimbusdesk' in raw)


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
    active = [t for t in terms if t.get('embargo_until') and today < t['embargo_until']]
    if not active:
        return []
    term = active[0]['term']
    # Same substring and date check as the production checker; each test must
    # check against every active term, not just the term chosen for generation.
    def observes(text):
        return any(is_active_embargo_mentioned(text, t['term'], t['embargo_until'], today) for t in active)
    rows = [(f'Our launch uses {term}.', 'fail', 'active embargo term'),
            (f'Our launch uses {term.upper()}.', 'fail', 'case variant'),
            ('A future release is planned.', 'pass', 'no known embargo term')]
    return [make_case(text, label, observes(text), reason) for text, label, reason in rows]


def make_case(text: str, expected: str, flagged: bool, rationale: str) -> dict:
    observed = 'fail' if flagged else 'pass'
    return {'text': text, 'intended_label': expected, 'observed': observed,
            'checker_miss': expected == 'fail' and not flagged,
            'false_positive': expected == 'pass' and flagged, 'rationale': rationale}
