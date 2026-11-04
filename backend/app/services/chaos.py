"""T18 – Chaos testing: tone-rule test generation and ambiguity flag.

Generates adversarial test cases for brand rules to find ambiguities,
contradictions, and gaps. Works deterministically without an LLM for
the core demo; enhances with LLM when available.
"""
from __future__ import annotations

import os
import re
from typing import Optional


# ──────────────────────────────────────────────────────────────────────────────
# Chaos axes (the dimensions of variation to test)
# ──────────────────────────────────────────────────────────────────────────────

CHAOS_AXES = [
    "formality",          # ultra-formal vs casual
    "specificity",        # vague vs over-specific
    "temporal",           # past vs present vs future tense
    "audience",           # B2B vs B2C vs internal
    "channel_mismatch",   # social copy on a press release
    "edge_number",        # borderline statistics (49,999 vs 50,001)
    "qualifier_removal",  # drop the qualifier (at_least, approx)
    "competitor_proxy",   # indirect competitor references
]


def generate_chaos_cases(rule: dict, n_per_axis: int = 2) -> list[dict]:
    """
    Generate chaos test cases for a single rule.
    Returns list of {text, axis, intended_label, rationale}.
    """
    description = rule.get("description", "")
    expected = rule.get("expected_behaviour", "")
    key = rule.get("key", "")
    category = rule.get("category", "")

    if _has_llm():
        return _llm_chaos(rule, n_per_axis)
    return _stub_chaos(key, description, expected, category)


def detect_ambiguities(rules: list[dict]) -> list[dict]:
    """
    Analyse a set of rules for ambiguities, contradictions, and overlaps.
    Returns a list of issues.
    """
    issues = []

    # Check for rules with unclear expected_behaviour
    for rule in rules:
        behaviour = (rule.get("expected_behaviour") or "").lower()
        key = rule.get("key", "")

        if "unclear" in behaviour or not behaviour:
            issues.append({
                "kind": "ambiguity",
                "rule_keys": [key],
                "description": f"Rule {key} has unclear or missing expected_behaviour: '{behaviour}'",
                "suggested_clarification": "Define specific pass/fail criteria with at least two examples.",
            })

        # Rules without examples
        examples = rule.get("examples", [])
        if not examples:
            issues.append({
                "kind": "missing_example",
                "rule_keys": [key],
                "description": f"Rule {key} ('{rule.get('label', '')}') has no examples.",
                "suggested_clarification": "Add at least one good and one bad example.",
            })

    # Check for overlapping rules (same category + same channel)
    by_category: dict[str, list] = {}
    for rule in rules:
        cat = rule.get("category", "other")
        by_category.setdefault(cat, []).append(rule)

    for cat, group in by_category.items():
        if len(group) > 1:
            keys = [r.get("key") for r in group]
            # Tone rules overlap check
            if cat == "tone" and len(group) >= 2:
                # R-02 (contractions) vs R-03 (formal tone) conflict
                has_contractions = any("contraction" in (r.get("description") or "").lower() for r in group)
                has_formal = any("formal" in (r.get("description") or "").lower() for r in group)
                if has_contractions and has_formal:
                    issues.append({
                        "kind": "contradiction",
                        "rule_keys": [r["key"] for r in group if "contraction" in (r.get("description") or "").lower() or "formal" in (r.get("description") or "").lower()],
                        "description": "Contradictory tone rules: one requires contractions (informal), another requires formal tone. These conflict for external communications.",
                        "suggested_clarification": "Clarify which channels each tone rule applies to; ensure non-overlapping applies_to scopes.",
                    })

    # Check for missing channel coverage
    claim_rules = [r for r in rules if r.get("category") == "claims"]
    has_all_channels = any("all" in (r.get("applies_to") or []) for r in claim_rules)
    if not has_all_channels and claim_rules:
        issues.append({
            "kind": "gap",
            "rule_keys": [r["key"] for r in claim_rules],
            "description": "No claim rule with applies_to=['all']. Internal content may bypass claim validation.",
            "suggested_clarification": "Ensure at least one claim validation rule applies to all channels.",
        })

    return issues


# ──────────────────────────────────────────────────────────────────────────────
# LLM path
# ──────────────────────────────────────────────────────────────────────────────

def _has_llm() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY"))


def _llm_chaos(rule: dict, n_per_axis: int) -> list[dict]:
    try:
        import json
        from openai import OpenAI
        client = OpenAI()
        system = (
            "You are a chaos testing expert for brand compliance rules. "
            "Generate adversarial test cases that probe edge cases, ambiguities, and "
            "boundary conditions of the given rule. For each case provide: "
            "text (a short content snippet), axis (the chaos dimension), "
            "intended_label (pass/fail/borderline), rationale (why this is a useful test)."
        )
        user = f"""Rule: {rule.get('key')} – {rule.get('label')}
Description: {rule.get('description')}
Expected behaviour: {rule.get('expected_behaviour')}
Severity: {rule.get('severity')}

Generate {n_per_axis * 4} chaos test cases covering different axes: {', '.join(CHAOS_AXES)}.
Return ONLY a JSON array."""
        resp = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            max_tokens=1000,
            temperature=0.7,
        )
        raw = resp.choices[0].message.content or "[]"
        data = json.loads(raw)
        if isinstance(data, list):
            return data
    except Exception:
        pass
    return _stub_chaos(rule.get("key", ""), rule.get("description", ""), rule.get("expected_behaviour", ""), rule.get("category", ""))


def _stub_chaos(key: str, description: str, expected: str, category: str) -> list[dict]:
    """Return deterministic chaos cases based on rule category."""
    cases = []

    if category == "tone":
        cases = [
            {"text": "WE ARE PLEASED TO ANNOUNCE OUR NEW OFFICE.", "axis": "formality", "intended_label": "fail", "rationale": "All-caps is not professional tone"},
            {"text": "Hey folks!! Big news incoming 🎉🎉🎉", "axis": "formality", "intended_label": "fail", "rationale": "Too casual for brand guidelines"},
            {"text": "We are pleased to welcome you.", "axis": "formality", "intended_label": "pass", "rationale": "Warm and professional"},
            {"text": "We're stoked you're here!", "axis": "channel_mismatch", "intended_label": "borderline", "rationale": "Contraction used; acceptable for social but may fail formal channel"},
        ]
    elif category == "claims":
        cases = [
            {"text": "Join 49,999 customers who trust us.", "axis": "edge_number", "intended_label": "fail", "rationale": "One below approved threshold – potential deception"},
            {"text": "Join 50,001 customers who trust us.", "axis": "edge_number", "intended_label": "borderline", "rationale": "Slightly above – check if fact supports this"},
            {"text": "Trusted by over fifty thousand support teams.", "axis": "qualifier_removal", "intended_label": "borderline", "rationale": "Written-out number may bypass automated checks"},
            {"text": "Guaranteed 100% uptime for all customers.", "axis": "qualifier_removal", "intended_label": "fail", "rationale": "Absolute claim without SLA qualification"},
        ]
    elif category == "terminology":
        cases = [
            {"text": "Your users can manage tickets from anywhere.", "axis": "specificity", "intended_label": "fail", "rationale": "'Users' instead of 'agents'"},
            {"text": "Nimbus helps teams resolve tickets faster.", "axis": "specificity", "intended_label": "fail", "rationale": "Abbreviated product name 'Nimbus' not approved"},
            {"text": "NimbusDesk agents resolve tickets faster.", "axis": "specificity", "intended_label": "pass", "rationale": "Correct product name and role term"},
        ]
    elif category == "embargo":
        cases = [
            {"text": "Our upcoming analytics suite (codenamed Project Heron) launches Q1.", "axis": "temporal", "intended_label": "fail", "rationale": "Direct embargo term usage"},
            {"text": "A major analytics release is coming soon.", "axis": "temporal", "intended_label": "pass", "rationale": "Vague enough to not breach embargo"},
        ]
    else:
        cases = [
            {"text": f"Test case for rule {key}: borderline scenario.", "axis": "specificity", "intended_label": "borderline", "rationale": "Generic borderline test"},
            {"text": f"Clear violation of rule {key}.", "axis": "formality", "intended_label": "fail", "rationale": "Generic fail test"},
        ]

    return cases
