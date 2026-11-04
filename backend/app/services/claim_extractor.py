"""T09 – Pure-Python claim extractor (no LLM required).

Scans body_text and returns a list of claim dicts:
  span_start, span_end, raw_text, entity, value_number, value_unit, qualifier
"""
from __future__ import annotations

import re
from typing import List, Optional

# ─── Pattern definitions ──────────────────────────────────────────────────────

# Numeric patterns with optional leading qualifiers
_NUMERIC_PATTERNS = [
    # "over 50,000" / "more than 65,000" / "at least 14"
    (
        r"(?:over|more\s+than|at\s+least|nearly|almost|around|approximately)\s+"
        r"(\d[\d,]*(?:\.\d+)?)\s*(%|percent|k\b|million|M\b)?",
        "at_least",
    ),
    # "50,000+" / "50k+" / "65,000+"
    (r"(\d[\d,]*(?:\.\d+)?)\s*(k|K)?\+", "at_least"),
    # "$19" / "USD 49"
    (r"\$\s*(\d[\d,]*(?:\.\d+)?)", "exact"),
    # "99.9%" / "100 percent"
    (r"(\d[\d,]*(?:\.\d+)?)\s*(?:%|percent)", "exact"),
    # bare numbers that look like known magnitudes: "50,000" "65,000" "14" "120"
    (r"\b(\d{1,3}(?:,\d{3})+(?:\.\d+)?)\b", "exact"),
    # simple small integers used as product features "14 languages", "4 minutes"
    (r"\b(\d{1,4})\s+(minutes?|days?|years?|agents?|languages?|integrations?)\b", "exact"),
    # "fifty thousand"
    (r"\b(fifty\s+thousand)\b", "at_least"),
]

# Certification patterns
_CERT_PATTERNS = [
    (r"\bSOC\s*2(?:\s+Type\s+[I]{1,2})?\b", "certification", "soc2"),
    (r"\bISO\s*27001\b", "certification", "iso27001"),
]

# Product name banned forms (R-04)
_BANNED_NAME_PATTERNS = [
    (r"\bNimbus\s+Desk\b", "product_name", "names"),
    (r"\bNimbusDESK\b", "product_name", "names"),
]

# Embargo term patterns
_EMBARGO_PATTERNS = [
    (r"\bProject\s+Heron\b", "embargo", "project_heron"),
]

# Customer count surface forms
_CUSTOMER_SURFACE = [
    r"\b(\d[\d,]*)\+?\s*customers?\b",
    r"\b(\d[\d,]*)\+?\s*customer\s+base\b",
    r"\b(\d[\d,]*)\s*k\+?\s*(?:support\s+)?teams?\b",
    r"\bfifty\s+thousand\s+customers?\b",
    r"\b50k\+?\b",
    r"\b65k\+?\b",
]


def _normalise_number(raw: str) -> Optional[float]:
    """Turn '50,000' / '50k' / 'fifty thousand' → float."""
    raw = raw.strip().lower().replace(",", "")
    if raw in ("fifty thousand",):
        return 50000.0
    if raw.endswith("k"):
        try:
            return float(raw[:-1]) * 1000
        except ValueError:
            return None
    try:
        return float(raw)
    except ValueError:
        return None


def extract_claims(body_text: str) -> List[dict]:
    """Return a list of claim dicts found in body_text."""
    claims: List[dict] = []
    seen_spans: set = set()

    def _add(start: int, end: int, raw: str, entity: str, value_number=None,
             value_unit=None, qualifier="exact"):
        # Deduplicate overlapping spans
        for s, e in seen_spans:
            if not (end <= s or start >= e):
                return
        seen_spans.add((start, end))
        claims.append({
            "span_start": start,
            "span_end": end,
            "raw_text": raw,
            "entity": entity,
            "value_number": value_number,
            "value_unit": value_unit,
            "qualifier": qualifier,
        })

    # ── Certification patterns ──
    for pattern, entity, key in _CERT_PATTERNS:
        for m in re.finditer(pattern, body_text, re.IGNORECASE):
            _add(m.start(), m.end(), m.group(), entity)

    # ── Banned product name patterns ──
    for pattern, entity, key in _BANNED_NAME_PATTERNS:
        for m in re.finditer(pattern, body_text, re.IGNORECASE):
            _add(m.start(), m.end(), m.group(), entity)

    # ── Embargo patterns ──
    for pattern, entity, key in _EMBARGO_PATTERNS:
        for m in re.finditer(pattern, body_text, re.IGNORECASE):
            _add(m.start(), m.end(), m.group(), entity)

    # ── Customer count surface forms ──
    for pattern in _CUSTOMER_SURFACE:
        for m in re.finditer(pattern, body_text, re.IGNORECASE):
            raw = m.group()
            # Try to grab a number from the match
            num_match = re.search(r"(\d[\d,]*)\s*(k)?", raw, re.IGNORECASE)
            val = None
            unit = "customers"
            qual = "at_least"
            if num_match:
                num_str = num_match.group(1).replace(",", "")
                if num_match.group(2):  # k suffix
                    val = float(num_str) * 1000
                else:
                    val = float(num_str)
            elif "fifty thousand" in raw.lower():
                val = 50000.0
            _add(m.start(), m.end(), raw, "customer_count", val, unit, qual)

    # ── General numeric patterns ──
    for pattern, qualifier in _NUMERIC_PATTERNS:
        for m in re.finditer(pattern, body_text, re.IGNORECASE):
            raw = m.group()
            # Skip if already captured by customer surface forms
            overlaps = False
            for s, e in list(seen_spans):
                if not (m.end() <= s or m.start() >= e):
                    overlaps = True
                    break
            if overlaps:
                continue

            # Extract numeric value
            groups = [g for g in m.groups() if g is not None]
            val = None
            unit = None
            if groups:
                raw_num = groups[0].replace(",", "")
                if "fifty thousand" in raw_num.lower():
                    val = 50000.0
                else:
                    val = _normalise_number(raw_num)
                    if len(groups) > 1 and groups[1]:
                        suffix = groups[1].lower()
                        if suffix == "k":
                            val = (val or 0) * 1000 if val else None
                        elif suffix in ("%", "percent"):
                            unit = "percent"
                        elif suffix in ("m", "million"):
                            val = (val or 0) * 1_000_000 if val else None
                        else:
                            unit = suffix

            # Determine entity from context
            entity = _guess_entity(raw, body_text, m.start())
            _add(m.start(), m.end(), raw, entity, val, unit, qualifier)

    return claims


def _guess_entity(raw: str, body_text: str, pos: int) -> str:
    """Heuristic: look at surrounding context to guess the entity type."""
    window = body_text[max(0, pos - 40):pos + len(raw) + 40].lower()
    if any(w in window for w in ("customer", "clients", "teams", "user")):
        return "customer_count"
    if any(w in window for w in ("$", "usd", "price", "plan", "per agent")):
        return "pricing"
    if any(w in window for w in ("uptime", "%", "sla")):
        return "uptime_sla"
    if any(w in window for w in ("response", "minute", "reply")):
        return "first_response"
    if any(w in window for w in ("integrat")):
        return "integrations"
    if any(w in window for w in ("language")):
        return "languages"
    if any(w in window for w in ("trial", "day")):
        return "free_trial"
    return "statistic"
