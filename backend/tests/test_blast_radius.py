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
