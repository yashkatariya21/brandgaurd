"""T14/T15 – Red Team (3 personas) + Prosecutor vs Defender debate panel.

When an LLM is available (OPENAI_API_KEY set), uses GPT-4o-mini.
Falls back to a deterministic stub so the demo always works without spend.
"""
from __future__ import annotations

import json
import os
from typing import Optional

# ──────────────────────────────────────────────────────────────────────────────
# Persona definitions (mirrors the Build Blueprint)
# ──────────────────────────────────────────────────────────────────────────────

PERSONAS = [
    {
        "name": "Brand Police",
        "role": "brand_manager",
        "lens": "Brand consistency and reputation",
        "instruction": (
            "You are a meticulous brand manager. Review this content strictly for brand voice, "
            "tone, correct product naming, approved claim language, and consistency with brand guidelines. "
            "List every deviation you find, however minor."
        ),
    },
    {
        "name": "Legal Eagle",
        "role": "legal",
        "lens": "Legal and compliance risk",
        "instruction": (
            "You are a senior in-house counsel. Review this content for absolute claims, "
            "unsubstantiated superlatives, pricing accuracy, certification claims, embargo violations, "
            "and any statement that could create legal liability. Be conservative."
        ),
    },
    {
        "name": "Customer Voice",
        "role": "customer",
        "lens": "Customer trust and clarity",
        "instruction": (
            "You are a sceptical enterprise customer evaluating this content before a buying decision. "
            "Identify anything confusing, contradictory, overpromised, or that would make you distrust the vendor. "
            "Focus on what matters to you as a buyer."
        ),
    },
]


def run_red_team(content_text: str, facts_summary: str, rules_summary: str) -> list[dict]:
    """Run all three personas over the content. Returns a list of persona reports."""
    results = []
    for persona in PERSONAS:
        report = _run_persona(persona, content_text, facts_summary, rules_summary)
        results.append({
            "persona": persona["name"],
            "role": persona["role"],
            "lens": persona["lens"],
            "findings": report,
        })
    return results


def run_prosecutor_defender(issue: str, content_text: str, fact_context: str) -> dict:
    """Run the Prosecutor vs Defender debate for a single finding."""
    if _has_llm():
        return _llm_debate(issue, content_text, fact_context)
    return _stub_debate(issue)


# ──────────────────────────────────────────────────────────────────────────────
# LLM path
# ──────────────────────────────────────────────────────────────────────────────

def _has_llm() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY"))


def _llm_call(system: str, user: str, max_tokens: int = 600) -> str:
    try:
        from openai import OpenAI
        client = OpenAI()
        resp = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            max_tokens=max_tokens,
            temperature=0.3,
        )
        return resp.choices[0].message.content or ""
    except Exception as exc:
        return f"[LLM call failed: {exc}]"


def _run_persona(persona: dict, content: str, facts: str, rules: str) -> list[dict]:
    if not _has_llm():
        return _stub_persona_findings(persona, content)

    system = persona["instruction"]
    user = f"""APPROVED FACTS SUMMARY:
{facts}

BRAND RULES SUMMARY:
{rules}

CONTENT TO REVIEW:
{content}

Respond with a JSON array of objects, each with: issue (string), severity ("low"|"medium"|"high"|"critical"), span_hint (a short quote from the text), suggested_fix (optional string).
Return ONLY the JSON array, no other text."""

    raw = _llm_call(system, user, max_tokens=800)
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return data
    except Exception:
        pass
    # If JSON parsing fails, return as a single text finding
    return [{"issue": raw[:500], "severity": "medium", "span_hint": "", "suggested_fix": None}]


def _llm_debate(issue: str, content: str, fact_context: str) -> dict:
    prosecutor_sys = (
        "You are the Prosecutor in a brand-compliance debate. "
        "Your job is to make the strongest possible case that this content issue IS a real problem "
        "that must be fixed before publication. Be specific, cite the brand rules and facts."
    )
    defender_sys = (
        "You are the Defender in a brand-compliance debate. "
        "Your job is to make the strongest possible case that this content issue is NOT a real problem, "
        "or that the current wording is acceptable given the context. Be fair and specific."
    )
    context = f"FACT CONTEXT:\n{fact_context}\n\nCONTENT:\n{content}\n\nISSUE UNDER DEBATE:\n{issue}"

    prosecutor_text = _llm_call(prosecutor_sys, context, max_tokens=400)
    defender_text = _llm_call(defender_sys, context, max_tokens=400)

    # Panel verdict
    panel_sys = (
        "You are the chair of a brand-compliance review panel. "
        "You have heard the Prosecutor and Defender arguments. "
        "Give a balanced verdict: is this a confirmed issue, possible issue, or false positive? "
        "If it needs fixing, provide a minimal edit. Respond in JSON: "
        '{"verdict": "confirmed"|"possible"|"false_positive", "reasoning": "...", "minimal_edit": "..." or null}'
    )
    panel_user = f"PROSECUTOR:\n{prosecutor_text}\n\nDEFENDER:\n{defender_text}"
    panel_raw = _llm_call(panel_sys, panel_user, max_tokens=300)
    try:
        panel = json.loads(panel_raw)
    except Exception:
        panel = {"verdict": "possible", "reasoning": panel_raw[:300], "minimal_edit": None}

    return {
        "prosecutor": prosecutor_text,
        "defender": defender_text,
        "verdict": panel.get("verdict", "possible"),
        "reasoning": panel.get("reasoning", ""),
        "minimal_edit": panel.get("minimal_edit"),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Deterministic stubs (no LLM required)
# ──────────────────────────────────────────────────────────────────────────────

def _stub_persona_findings(persona: dict, content: str) -> list[dict]:
    """Return heuristic findings without LLM, keyed to the persona's lens."""
    import re
    findings = []

    if persona["name"] == "Brand Police":
        if re.search(r"Nimbus\s+Desk|NimbusDESK", content, re.IGNORECASE):
            findings.append({
                "issue": "Incorrect product name format detected (should be 'NimbusDesk', one word).",
                "severity": "high",
                "span_hint": re.search(r"Nimbus\s+Desk|NimbusDESK", content, re.IGNORECASE).group(),
                "suggested_fix": "NimbusDesk",
            })
        if re.search(r"\busers?\b", content, re.IGNORECASE):
            findings.append({
                "issue": "Brand guidelines say 'customers' (not 'users') for client organisations.",
                "severity": "low",
                "span_hint": "users",
                "suggested_fix": "customers",
            })
        if not re.search(r"\bwe(?:'re|'re| are)\b|\bour\b", content, re.IGNORECASE):
            findings.append({
                "issue": "Content lacks the warm, first-person brand voice. Consider adding 'we' or 'our'.",
                "severity": "low",
                "span_hint": "",
                "suggested_fix": None,
            })

    elif persona["name"] == "Legal Eagle":
        if re.search(r"guaranteed?|100\s*%|never\s+fail|always\s+work", content, re.IGNORECASE):
            findings.append({
                "issue": "Absolute guarantee language detected. This creates enforceable legal commitments.",
                "severity": "high",
                "span_hint": re.search(r"guaranteed?|100\s*%|never\s+fail|always\s+work", content, re.IGNORECASE).group(),
                "suggested_fix": "Remove or qualify with 'typically' or 'in our benchmark'.",
            })
        if re.search(r"ISO\s*27001\s+certified", content, re.IGNORECASE):
            findings.append({
                "issue": "ISO 27001 certified claim found. Company is NOT certified — this is a false claim.",
                "severity": "critical",
                "span_hint": "ISO 27001 certified",
                "suggested_fix": "ISO 27001 certification in progress",
            })
        if re.search(r"Project\s+Heron", content, re.IGNORECASE):
            findings.append({
                "issue": "Embargoed project codename 'Project Heron' appears in content.",
                "severity": "critical",
                "span_hint": "Project Heron",
                "suggested_fix": "Remove all references to Project Heron before the embargo lift date.",
            })

    elif persona["name"] == "Customer Voice":
        import re as _re
        nums = _re.findall(r"[\d,]+\+?\s*customers?", content, re.IGNORECASE)
        if len(set(nums)) > 1:
            findings.append({
                "issue": f"Multiple different customer count claims found: {nums}. This is confusing.",
                "severity": "medium",
                "span_hint": str(nums[0]),
                "suggested_fix": "Use a single consistent customer count throughout.",
            })
        if re.search(r"\b4.5\b|\b5\s+stars?\b|award.winning", content, re.IGNORECASE):
            findings.append({
                "issue": "Star ratings or award claims present. As a buyer I'd want to verify the source.",
                "severity": "medium",
                "span_hint": "",
                "suggested_fix": "Add source and date for any rating or award claim.",
            })
        if not findings:
            findings.append({
                "issue": "Content appears clear and credible from a customer perspective.",
                "severity": "low",
                "span_hint": "",
                "suggested_fix": None,
            })

    return findings


def _stub_debate(issue: str) -> dict:
    return {
        "prosecutor": (
            f"The issue '{issue[:200]}' represents a clear brand compliance risk. "
            "If this content is published as-is, it could mislead customers, "
            "create legal liability, and undermine brand trust. The brand guidelines are clear "
            "on this point and there is no approved fact that supports the claim as written."
        ),
        "defender": (
            f"While the concern about '{issue[:200]}' is noted, the intent of the content "
            "is clearly positive and the risk may be lower in practice. "
            "Readers understand marketing language, and the broader context of the piece "
            "makes the intended meaning clear. A minor edit may resolve the concern without "
            "a full rewrite."
        ),
        "verdict": "possible",
        "reasoning": "Both arguments have merit. Human review is recommended before publication.",
        "minimal_edit": "Consider adding qualification language and verifying against the latest approved facts.",
    }
