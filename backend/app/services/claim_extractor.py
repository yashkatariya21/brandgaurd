"""T09 – Pure-Python claim extractor (no LLM required).

Every claim carries: span_start, span_end, raw_text, entity,
attribute (the semantic type used for blast-radius matching),
value_number, value_unit, qualifier.
"""
from __future__ import annotations

import re
from typing import List, Optional

# ─── Attribute vocabulary ────────────────────────────────────────────────────
# Maps unit words → canonical attribute so blast-radius can compare apples with apples
_UNIT_TO_ATTRIBUTE = {
    "customers": "customer_count",
    "customer": "customer_count",
    "customer base": "customer_count",
    "support teams": "customer_count",
    "support team": "customer_count",
    "tickets": "ticket_volume",
    "ticket": "ticket_volume",
    "agents": "agent_count",
    "agent": "agent_count",
    "integrations": "integrations",
    "integration": "integrations",
    "languages": "languages",
    "language": "languages",
    "days": "free_trial",
    "day": "free_trial",
    "minutes": "first_response",
    "minute": "first_response",
}

# ─── Patterns ────────────────────────────────────────────────────────────────

_CERT_PATTERNS = [
    (r"\bSOC\s*2(?:\s+Type\s+[I1]{1,2})?\b", "certification", "soc2"),
    (r"\bISO\s*27001\b", "certification", "iso27001"),
]

_BANNED_NAME_PATTERNS = [
    (r"\bNimbus\s+Desk\b", "product_name", "banned_product_name"),
    (r"\bNimbusDESK\b", "product_name", "banned_product_name"),
]

_EMBARGO_PATTERNS = [
    (r"\bProject\s+Heron\b", "embargo", "embargo_term"),
]

# Word-number table (lower-case key)
_WORD_NUMBERS: dict[str, float] = {
    "fifty thousand": 50000.0,
    "fifty-thousand": 50000.0,
    "sixty-five thousand": 65000.0,
    "sixty five thousand": 65000.0,
}

# Quantity patterns: each tuple is (regex, attribute_hint, qualifier_hint)
# The named group "num" carries the numeric string; "unit" the unit word.
_QUANTITY_PATTERNS: list[tuple[str, str, str]] = [
    # "over 50,000 customers" / "50,000+ customers" / "50k+ support teams"
    (
        r"(?:over\s+|more\s+than\s+|at\s+least\s+|nearly\s+|almost\s+|around\s+)?(?P<num>[\d,]+[kK]?)\+?\s*"
        r"(?P<unit>customers?|customer\s+base|support\s+teams?|agents?|tickets?|integrations?|languages?)",
        "count", "at_least",
    ),
    # "$19 per agent per month"
    (r"\$(?P<num>\d+(?:\.\d+)?)\s+per\s+agent\s+per\s+month", "price_per_agent_month", "exact"),
    # "99.9% uptime"
    (r"(?P<num>\d+(?:\.\d+)?)\s*%\s*(?:monthly\s+)?(?P<unit>uptime|availability)", "uptime_percent", "exact"),
    # "14-day free trial" / "14 days"
    (r"(?P<num>\d+)[- ]days?\s*(?:free\s+trial)?", "free_trial", "exact"),
    # "median 4 minutes" / "4-minute"
    (r"(?:median\s+)?(?P<num>\d+)[- ]minutes?", "first_response", "exact"),
    # Standalone "50,000" / "50k" (comma-grouped numbers)
    (r"(?P<num>\d{1,3}(?:,\d{3})+)\+?", "count", "at_least"),
]


# ─── Number normalisation ────────────────────────────────────────────────────

def normalise_number(raw: str) -> Optional[float]:
    """Turn '50,000' / '50k' / 'fifty thousand' etc. → float. Returns None if unparseable."""
    s = raw.strip()
    # Word-form lookup (case-insensitive)
    for word, val in _WORD_NUMBERS.items():
        if word in s.lower():
            return val
    # Strip commas
    s = s.replace(",", "")
    # k/K suffix
    if s.lower().endswith("k"):
        try:
            return float(s[:-1]) * 1000
        except ValueError:
            return None
    try:
        return float(s)
    except ValueError:
        return None


def _infer_attribute(unit: str, attr_hint: str, raw: str, body: str, pos: int) -> str:
    """Map a unit string to a canonical attribute, falling back to context heuristics."""
    if unit:
        unit_lower = unit.strip().lower()
        for key, attr in _UNIT_TO_ATTRIBUTE.items():
            if key in unit_lower:
                return attr
    # Context heuristic
    window = body[max(0, pos - 40): pos + len(raw) + 40].lower()
    if any(w in window for w in ("ticket", "handle", "resolve")):
        return "ticket_volume"
    if any(w in window for w in ("customer", "client", "trust")):
        return "customer_count"
    if any(w in window for w in ("agent", "seat", "user")):
        return "agent_count"
    if any(w in window for w in ("$", "usd", "price", "plan", "per agent")):
        return "price_per_agent_month"
    if any(w in window for w in ("uptime", "%", "sla")):
        return "uptime_percent"
    if any(w in window for w in ("response", "minute", "reply")):
        return "first_response"
    if any(w in window for w in ("integrat")):
        return "integrations"
    if any(w in window for w in ("language")):
        return "languages"
    return attr_hint or "statistic"


# ─── Public API ──────────────────────────────────────────────────────────────

def extract_claims(body_text: str) -> List[dict]:
    """Return a list of claim dicts. Each dict contains:
    span_start, span_end, raw_text, entity, attribute, value_number, value_unit, qualifier.
    """
    claims: List[dict] = []
    seen: set[tuple[int, int]] = set()

    def _add(start: int, end: int, raw: str, entity: Optional[str],
             attribute: Optional[str], value_number=None, value_unit=None, qualifier="exact"):
        # Skip overlapping spans
        for s, e in seen:
            if not (end <= s or start >= e):
                return
        seen.add((start, end))
        claims.append({
            "span_start": start,
            "span_end": end,
            "raw_text": raw,
            "entity": entity,
            "attribute": attribute,
            "value_number": value_number,
            "value_unit": value_unit,
            "qualifier": qualifier,
        })

    # 1. Certification patterns
    for pattern, entity, attribute in _CERT_PATTERNS:
        for m in re.finditer(pattern, body_text, re.IGNORECASE):
            _add(m.start(), m.end(), m.group(), entity, attribute)

    # 2. Banned product name forms
    for pattern, entity, attribute in _BANNED_NAME_PATTERNS:
        for m in re.finditer(pattern, body_text, re.IGNORECASE):
            _add(m.start(), m.end(), m.group(), entity, attribute)

    # 3. Embargo patterns
    for pattern, entity, attribute in _EMBARGO_PATTERNS:
        for m in re.finditer(pattern, body_text, re.IGNORECASE):
            _add(m.start(), m.end(), m.group(), entity, attribute)

    # 4. Word-form numbers (e.g. "fifty thousand customers")
    for word, val in _WORD_NUMBERS.items():
        pattern = re.escape(word) + r"(?:\s+(?P<unit>customers?|support\s+teams?|tickets?|agents?))?"
        for m in re.finditer(pattern, body_text, re.IGNORECASE):
            unit = (m.groupdict().get("unit") or "").strip().lower()
            attribute = _infer_attribute(unit, "count", m.group(), body_text, m.start())
            _add(m.start(), m.end(), m.group(), None, attribute, val,
                 unit or None, "at_least")

    # 5. Quantity patterns
    for pattern, attr_hint, qual_hint in _QUANTITY_PATTERNS:
        for m in re.finditer(pattern, body_text, re.IGNORECASE):
            raw = m.group()
            groups = m.groupdict()
            num_str = groups.get("num", "")
            val = normalise_number(num_str) if num_str else None
            unit = (groups.get("unit") or "").strip().lower()
            qualifier = "at_least" if ("+" in raw or
                                        re.match(r"over|more\s+than|at\s+least", raw, re.IGNORECASE)) \
                        else qual_hint
            attribute = _infer_attribute(unit, attr_hint, raw, body_text, m.start())
            _add(m.start(), m.end(), raw, None, attribute, val, unit or None, qualifier)

    claims.sort(key=lambda c: c["span_start"])
    return claims
