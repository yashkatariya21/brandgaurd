"""T6 – Pure-function tests for blast-radius matching (no DB required).

Acceptance criteria from the brief:
  confirmed = A-01, A-03, A-04, A-06
  possible  = A-05 (tickets, not customers)
  not affected = A-02 (uses 65,000+), A-07 (50 customers, different value),
                 A-08..A-12 (no 50,000 reference)
  49,999 and 50,001 are NOT matched.
  normalisation: 50k, fifty thousand, 50,000 all → 50000
"""
import pytest
from typing import Optional

from app.services.claim_extractor import normalise_number, extract_claims
from app.api.blast_radius import _scan_item, _normalise_old_value


# ─── Normalisation tests ──────────────────────────────────────────────────────

@pytest.mark.parametrize("raw,expected", [
    ("50,000", 50000.0),
    ("50000",  50000.0),
    ("50k",    50000.0),
    ("50K",    50000.0),
    ("fifty thousand", 50000.0),
    ("fifty-thousand", 50000.0),
    ("65,000", 65000.0),
    ("65k",    65000.0),
    ("19",     19.0),
    ("99.9",   99.9),
    ("14",     14.0),
    ("120",    120.0),
])
def test_normalise_number(raw, expected):
    assert normalise_number(raw) == expected


def test_normalise_number_returns_none_for_garbage():
    assert normalise_number("abc") is None
    assert normalise_number("") is None


# ─── Seed-asset texts (from seed_data.py) ────────────────────────────────────

OLD_TEXT = "50,000+ customers"
OLD_NORM = 50000.0
NEW_TEXT = "65,000+ customers"
FACT_ATTR = "customer_count"
FACT_ID   = "fact-customer-count"


def _scan(body: str, linked: bool = False) -> Optional[dict]:
    return _scan_item(
        body,
        OLD_NORM,
        OLD_TEXT,
        NEW_TEXT,
        FACT_ATTR,
        FACT_ID if linked else None,
        FACT_ID,
    )


# ─── Per-asset acceptance tests ──────────────────────────────────────────────

class TestAssetMatching:
    # A-01: "Join 50,000+ customers who trust NimbusDesk"  → confirmed
    def test_A01_confirmed(self):
        r = _scan("Join 50,000+ customers who trust NimbusDesk")
        assert r is not None
        assert r["match_type"] == "confirmed"

    # A-02: "Join 65,000+ customers"  → not affected (new value)
    def test_A02_not_affected(self):
        r = _scan("Join 65,000+ customers")
        assert r is None

    # A-03: "Trusted by 50k+ support teams"  → confirmed (support teams → customer_count)
    def test_A03_confirmed(self):
        r = _scan("Trusted by 50k+ support teams")
        assert r is not None
        assert r["match_type"] == "confirmed"

    # A-04: "Over 50,000 customers across 40 countries"  → confirmed
    def test_A04_confirmed(self):
        r = _scan("Over 50,000 customers across 40 countries")
        assert r is not None
        assert r["match_type"] == "confirmed"

    # A-05: "Our agents handle 50,000 tickets every day"  → possible (attribute mismatch)
    def test_A05_possible(self):
        r = _scan("Our agents handle 50,000 tickets every day")
        assert r is not None
        assert r["match_type"] == "possible"

    # A-06: "fifty thousand customers and counting"  → confirmed
    def test_A06_confirmed(self):
        r = _scan("fifty thousand customers and counting")
        assert r is not None
        assert r["match_type"] == "confirmed"

    # A-07: "We started in 2016 with just 50 customers"  → not affected (50, not 50,000)
    def test_A07_not_affected(self):
        r = _scan("We started in 2016 with just 50 customers")
        assert r is None

    # A-08: pricing content — no 50,000 reference
    def test_A08_not_affected(self):
        r = _scan("Starter plan from $19 per agent per month")
        assert r is None

    # A-09: pricing page
    def test_A09_not_affected(self):
        r = _scan("Starter: $19 / Pro: $49 per agent per month")
        assert r is None

    # A-10: award banner
    def test_A10_not_affected(self):
        r = _scan("Named a Top 50 SaaS Tool 2024")
        assert r is None

    # A-11: security PDF
    def test_A11_not_affected(self):
        r = _scan("SOC 2 Type II certified")
        assert r is None

    # A-12: uptime copy
    def test_A12_not_affected(self):
        r = _scan("99.9% uptime for Enterprise customers")
        assert r is None


# ─── Near-miss tests: 49,999 and 50,001 must NOT match ───────────────────────

class TestNearMisses:
    def test_49999_not_matched(self):
        assert _scan("Join 49,999 customers who trust us.") is None

    def test_50001_not_matched(self):
        assert _scan("Join 50,001 customers who trust us.") is None

    def test_50001_borderline_claim(self):
        # 50,001 is NOT the old value → no match
        assert _scan("Over 50,001 customers.") is None


# ─── Linked-claim shortcut: linked → always confirmed ────────────────────────

def test_linked_claim_confirms_even_with_wrong_attribute():
    # If the claim is already linked to this fact via content_claims, it's confirmed
    r = _scan_item(
        "Our agents handle 50,000 tickets every day",
        OLD_NORM, OLD_TEXT, NEW_TEXT,
        FACT_ATTR,
        FACT_ID,  # linked
        FACT_ID,
    )
    assert r is not None
    assert r["match_type"] == "confirmed"


def test_linked_span_is_claim_specific_and_matching_claim_wins():
    body = "Our agents handle 50,000 tickets daily; we also serve 50,000 customers."
    claims = extract_claims(body)
    ticket = next(c for c in claims if c["attribute"] == "ticket_volume")
    customer = next(c for c in claims if c["attribute"] == "customer_count")
    assert (ticket["span_start"], ticket["span_end"]) != (
        customer["span_start"], customer["span_end"]
    )

    only_ticket = _scan_item(
        "Our agents handle 50,000 tickets daily",
        OLD_NORM, OLD_TEXT, NEW_TEXT, FACT_ATTR, None, FACT_ID,
        {(customer["span_start"], customer["span_end"])},
    )
    assert only_ticket is not None
    assert only_ticket["match_type"] == "possible"

    both_claims = _scan_item(
        body, OLD_NORM, OLD_TEXT, NEW_TEXT, FACT_ATTR, None, FACT_ID,
        {(customer["span_start"], customer["span_end"])},
    )
    assert both_claims is not None
    assert both_claims["match_type"] == "confirmed"
    assert both_claims["stale_text"].endswith("customers")


# ─── Normalisation variant coverage ──────────────────────────────────────────

class TestNormalisationVariants:
    def test_50k_customers(self):
        r = _scan("50k+ customers")
        assert r is not None and r["match_type"] == "confirmed"

    def test_fifty_thousand_hyphen(self):
        r = _scan("fifty-thousand customers and counting")
        assert r is not None and r["match_type"] == "confirmed"

    def test_50000_no_comma(self):
        r = _scan("50000 customers served")
        assert r is not None and r["match_type"] == "confirmed"


def test_nonnumeric_fact_exact_text_is_possible_and_offsets_are_exact():
    body = 'Headquartered in Pune, India since 2016.'
    match = _scan_item(body, None, 'Pune, India', 'Mumbai, India', None, None, 'hq')
    assert match['match_type'] == 'possible'
    assert body[match['span_start']:match['span_end']] == 'Pune, India'


def test_text_matching_avoids_word_fragments_and_unchanged_values():
    assert _scan_item('A leader named Annabelle', None, 'Ann', 'Bea', None, None, 'ceo') is None
    assert _scan_item('Based in Pune', None, 'Pune', 'Pune', None, None, 'hq') is None


def test_same_numeric_value_but_changed_qualifier_requires_review():
    match = _scan_item('We serve 50,000 customers', 50000, '50,000+ customers',
                       'Approximately 50,000 customers', 'customer_count', None, 'customer_count',
                       new_norm=50000)
    assert match['match_type'] == 'possible'


def test_historical_vector_candidates_disabled_by_default(monkeypatch):
    from app.api.blast_radius import _historical_vector_candidates
    monkeypatch.delenv('GRAPH_VECTOR_MATCH_ENABLED', raising=False)
    class NoQuery:
        def execute(self, *args): raise AssertionError('vectors must be opt-in')
    assert _historical_vector_candidates(NoQuery(), 'org', 'fact', 'version') == {}


def test_historical_vector_candidates_remain_possible_and_reject_nonfinite(monkeypatch):
    from app.api.blast_radius import _historical_vector_candidates
    monkeypatch.setenv('GRAPH_VECTOR_MATCH_ENABLED', 'true')
    class Result:
        def fetchall(self):
            return [dict(content_version_id='v1', span_start=0, span_end=4, raw_text='text', embedding_model='m', score=.93),
                    dict(content_version_id='v2', span_start=0, span_end=4, raw_text='text', embedding_model='m', score=float('nan'))]
    class Conn:
        def execute(self, query, args):
            assert args == ('org', 'fact', 'old-version')
            assert "fv.status='superseded'" in query
            return Result()
    candidates = _historical_vector_candidates(Conn(), 'org', 'fact', 'old-version')
    assert list(candidates) == ['v1']
    assert candidates['v1']['match_type'] == 'possible'
    assert candidates['v1']['match_method'] == 'embedding'


def test_nearly_word_and_digit_values_remain_possible():
    for text in ('nearly 50,000 customers', 'nearly fifty thousand customers'):
        result = _scan(text)
        assert result is not None and result['match_type'] == 'possible'
