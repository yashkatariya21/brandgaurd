"""T11 – Blast-radius slice: content affected when a fact changes.

The 50,000+ → 65,000+ demo: approving the customer_count v2 draft triggers
impact analysis across all registered content items.
"""
from __future__ import annotations

import re
from typing import Optional


def compute_blast_radius(
    fact_key: str,
    old_value_text: str,
    old_value_number: Optional[float],
    new_value_text: str,
    new_value_number: Optional[float],
    content_items: list[dict],
    decoy_item_ids: Optional[set] = None,
) -> dict:
    """
    Scan all content items and return those that reference the old fact value.

    Returns:
        {
          "fact_key": str,
          "old_value": str,
          "new_value": str,
          "affected": [...],   # items that reference the old value
          "clean": [...],      # items already using the new value or unrelated
          "decoys_excluded": [...],  # items that matched a decoy pattern (if provided)
        }
    """
    affected = []
    clean = []
    decoys_excluded = []

    # Build patterns to match the old value
    old_patterns = _build_patterns(old_value_text, old_value_number)
    new_patterns = _build_patterns(new_value_text, new_value_number)

    for item in content_items:
        item_id = str(item.get("id", ""))
        body = item.get("body_text", "") or ""
        title = item.get("title", "") or ""
        full_text = f"{title} {body}"

        # Skip decoys
        if decoy_item_ids and item_id in decoy_item_ids:
            decoys_excluded.append({
                "id": item_id,
                "title": title,
                "channel": item.get("channel"),
                "reason": "decoy",
            })
            continue

        old_matches = [m.group() for p in old_patterns for m in re.finditer(p, full_text, re.IGNORECASE)]
        new_matches = [m.group() for p in new_patterns for m in re.finditer(p, full_text, re.IGNORECASE)]

        if old_matches:
            affected.append({
                "id": item_id,
                "title": title,
                "channel": item.get("channel"),
                "status": item.get("status"),
                "registered_state": item.get("registered_state"),
                "matched_phrases": list(set(old_matches)),
                "suggested_replacement": new_value_text,
                "urgency": _urgency(item),
            })
        elif new_matches:
            clean.append({
                "id": item_id,
                "title": title,
                "channel": item.get("channel"),
                "status": item.get("status"),
                "matched_phrases": list(set(new_matches)),
                "note": "Already uses updated value",
            })
        else:
            clean.append({
                "id": item_id,
                "title": title,
                "channel": item.get("channel"),
                "status": item.get("status"),
                "note": "No reference to this fact",
            })

    # Sort affected by urgency (published > scheduled > approved > draft)
    urgency_order = {"published": 0, "scheduled": 1, "approved": 2, "draft": 3}
    affected.sort(key=lambda x: urgency_order.get(x.get("urgency", "draft"), 4))

    return {
        "fact_key": fact_key,
        "old_value": old_value_text,
        "new_value": new_value_text,
        "affected_count": len(affected),
        "clean_count": len(clean),
        "decoys_excluded_count": len(decoys_excluded),
        "affected": affected,
        "clean": clean,
        "decoys_excluded": decoys_excluded,
    }


def _build_patterns(value_text: str, value_number: Optional[float]) -> list[str]:
    """Build regex patterns that will match references to this value."""
    patterns = []

    # Direct text match (escaped)
    patterns.append(re.escape(value_text))

    if value_number is not None:
        n = int(value_number) if value_number == int(value_number) else value_number

        # Numeric with commas: 50,000 or 65,000
        patterns.append(r"\b" + re.escape(f"{n:,}") + r"\+?\s*(?:customers?|support\s+teams?)?")

        # k-notation: 50k, 65k
        if n >= 1000:
            k = n / 1000
            k_str = f"{int(k)}k" if k == int(k) else f"{k}k"
            patterns.append(r"\b" + re.escape(k_str) + r"\+?\s*(?:customers?|support\s+teams?)?")

        # Written out: "fifty thousand"
        word_forms = {
            50000: ["fifty thousand", "fifty-thousand"],
            65000: ["sixty-five thousand", "sixty five thousand", "65 thousand"],
        }
        for form in word_forms.get(int(n), []):
            patterns.append(re.escape(form))

    return patterns


def _urgency(item: dict) -> str:
    """Return urgency category based on content status."""
    reg = item.get("registered_state", "none")
    status = item.get("status", "draft")
    if reg == "published":
        return "published"
    if reg == "scheduled":
        return "scheduled"
    if status == "approved":
        return "approved"
    return "draft"
