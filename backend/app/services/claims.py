"""T09 – Claim extraction and number normalisation.

Extracts statistical / factual claims from text without requiring an LLM.
Uses regex patterns tuned to the NimbusDesk seed data and general patterns.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


# ──────────────────────────────────────────────────────────────────────────────
# Data model
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class Claim:
    span_start: int
    span_end: int
    raw_text: str
    entity: Optional[str] = None
    attribute: Optional[str] = None
    value_number: Optional[float] = None
    value_unit: Optional[str] = None
    qualifier: Optional[str] = None  # "exact" | "at_least" | "approx"


# ──────────────────────────────────────────────────────────────────────────────
# Patterns
# ──────────────────────────────────────────────────────────────────────────────

# Written-out numbers that appear in the seed data
_WORD_NUMBERS = {
    "fifty thousand": 50000,
    "sixty-five thousand": 65000,
    "sixty five thousand": 65000,
    "one hundred": 100,
}

_QUALIFIER_PREFIXES = re.compile(
    r"(over|more\s+than|at\s+least|approximately|around|about|nearly|up\s+to|more\s+then)",
    re.IGNORECASE,
)

# Patterns that signal a claim worth extracting
_CLAIM_PATTERNS: list[tuple[str, dict]] = [
    # "50,000+ customers" / "65,000+ customers" / "50k+ ..."
    (
        r"(?P<qualifier_word>over\s+|more\s+than\s+|at\s+least\s+)?(?P<num>[\d,]+[kK]?)\+?\s*(?P<unit>customers?|agents?|integrations?|languages?|support\s+team|users?)",
        {"attribute": "count"},
    ),
    # "$19 per agent per month" / "$49 ..."
    (
        r"\$(?P<num>\d+(?:\.\d+)?)\s+per\s+agent\s+per\s+month",
        {"attribute": "price_per_agent_month", "value_unit": "USD"},
    ),
    # "99.9% uptime" / "99.9% monthly uptime"
    (
        r"(?P<num>\d+(?:\.\d+)?)\s*%\s*(?P<unit>uptime|availability)",
        {"attribute": "uptime_percent", "value_unit": "percent"},
    ),
    # "14-day free trial" / "14 days"
    (
        r"(?P<num>\d+)[- ]day(?:s)?\s*(?:free\s+trial)?",
        {"attribute": "trial_days", "value_unit": "days"},
    ),
    # "median 4 minutes" / "4-minute"
    (
        r"(?:median\s+)?(?P<num>\d+)[- ]minute",
        {"attribute": "response_time", "value_unit": "minutes"},
    ),
    # "120+ integrations" (already caught above but also as standalone)
    (
        r"(?P<num>\d+)\+\s*(?P<unit>integrations?)",
        {"attribute": "integrations_count"},
    ),
    # "14 supported languages"
    (
        r"(?P<num>\d+)\s+supported\s+(?P<unit>languages?)",
        {"attribute": "languages_count"},
    ),
    # Embargo / codenames
    (
        r"\bProject\s+Heron\b",
        {"attribute": "embargo_term", "entity": "Project Heron"},
    ),
    # Banned name forms
    (
        r"\bNimbus\s+Desk\b|\bNimbusDESK\b",
        {"attribute": "banned_product_name"},
    ),
    # SOC 2 certification claim
    (
        r"SOC\s*2\s+Type\s+(?:I{1,2}|1|2)\s+certified",
        {"attribute": "certification", "entity": "SOC 2"},
    ),
    # ISO 27001
    (
        r"ISO\s*27001\s+certified",
        {"attribute": "certification", "entity": "ISO 27001"},
    ),
    # Founded / since year
    (
        r"(?:founded|since|established)\s+(?:in\s+)?(?P<num>20\d{2})",
        {"attribute": "founding_year"},
    ),
    # Absolute guarantees
    (
        r"\b(?:guaranteed?|100\s*%|never|always)\b",
        {"attribute": "absolute_claim"},
    ),
    # Superlatives
    (
        r"\b(?:#1|number[- ]one|best|leading|top[- ]\d+|#\d+)\b",
        {"attribute": "superlative"},
    ),
]


# ──────────────────────────────────────────────────────────────────────────────
# Number normalisation
# ──────────────────────────────────────────────────────────────────────────────

def _normalise_number(raw: str) -> Optional[float]:
    """Turn "50,000", "65k", "50K" etc. into a float."""
    s = raw.replace(",", "").strip().lower()
    if s.endswith("k"):
        try:
            return float(s[:-1]) * 1000
        except ValueError:
            return None
    try:
        return float(s)
    except ValueError:
        # Try word-form lookup
        for word, val in _WORD_NUMBERS.items():
            if word in raw.lower():
                return float(val)
        return None


def _detect_qualifier(prefix: str) -> str:
    if not prefix:
        return "exact"
    p = prefix.lower().strip()
    if re.search(r"over|more|at\s+least", p):
        return "at_least"
    if re.search(r"approx|around|about|nearly|up\s+to", p):
        return "approx"
    return "at_least"


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def extract_claims(text: str) -> list[Claim]:
    """Extract all recognisable claims from *text*. Returns a list of Claim objects."""
    claims: list[Claim] = []
    seen_spans: set[tuple[int, int]] = set()

    for pattern, meta in _CLAIM_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            start, end = m.start(), m.end()
            # De-duplicate overlapping matches
            if any(s <= start < e2 or s < end <= e2 for (s, e2) in seen_spans):
                continue
            seen_spans.add((start, end))

            raw = m.group(0)
            num_str = m.groupdict().get("num")
            value_number = _normalise_number(num_str) if num_str else None
            unit = m.groupdict().get("unit") or meta.get("value_unit")
            qualifier_word = m.groupdict().get("qualifier_word", "")
            qualifier = _detect_qualifier(qualifier_word or "")

            # Check for a "+" sign in the raw match → at_least
            if "+" in raw:
                qualifier = "at_least"

            claims.append(
                Claim(
                    span_start=start,
                    span_end=end,
                    raw_text=raw,
                    entity=meta.get("entity"),
                    attribute=meta.get("attribute"),
                    value_number=value_number,
                    value_unit=unit,
                    qualifier=qualifier,
                )
            )

    # Sort by position in document
    claims.sort(key=lambda c: c.span_start)
    return claims
