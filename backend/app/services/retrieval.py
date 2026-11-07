"""T7 – Structured retrieval: return approved facts and rules as context strings.

No embeddings for Round 2. Just approved current records.
"""
from __future__ import annotations

from typing import Optional


def get_facts_context(conn, org_id) -> str:
    """Return a summary of all approved fact versions as a string."""
    rows = conn.execute(
        """SELECT f.key, f.label, fv.value_text, fv.version_no, fv.expires_at,
                  f.owner_user_id
           FROM facts f
           JOIN fact_versions fv ON fv.id = f.current_version_id
           WHERE f.org_id = %s AND fv.status = 'approved'
           ORDER BY f.key""",
        (org_id,),
    ).fetchall()

    if not rows:
        return "(no approved facts found)"

    lines = []
    for r in rows:
        expiry = f", expires {r['expires_at']}" if r["expires_at"] else ""
        lines.append(f"  {r['key']}: {r['value_text']} (v{r['version_no']}{expiry})")
    return "\n".join(lines)


def get_rules_context(conn, org_id) -> str:
    """Return a summary of all approved rule versions as a string."""
    rows = conn.execute(
        """SELECT r.key, r.label, r.severity, rv.description, rv.expected_behaviour
           FROM rules r
           JOIN rule_versions rv ON rv.id = r.current_version_id
           WHERE r.org_id = %s AND rv.status = 'approved'
           ORDER BY r.key""",
        (org_id,),
    ).fetchall()

    if not rows:
        return "(no approved rules found)"

    lines = []
    for r in rows:
        behaviour = f" | expected: {r['expected_behaviour']}" if r["expected_behaviour"] else ""
        lines.append(f"  {r['key']} [{r['severity']}]: {r['description']}{behaviour}")
    return "\n".join(lines)


def find_cited_fact(conn, org_id, fact_key: Optional[str]) -> Optional[dict]:
    """
    Validate an explicitly returned fact key against approved tenant facts.
    Returns {'fact_id': ..., 'rule_id': None} or None.
    """
    if not fact_key:
        return None
    rows = conn.execute(
        """SELECT f.id, f.key
           FROM facts f
           JOIN fact_versions fv ON fv.id = f.current_version_id
           WHERE f.org_id = %s AND fv.status = 'approved'""",
        (org_id,),
    ).fetchall()

    for r in rows:
        if fact_key.strip() == r["key"]:
            return {"fact_id": str(r["id"]), "rule_id": None}
    return None


def find_cited_rule(conn, org_id, rule_key: Optional[str]) -> Optional[dict]:
    """Validate an explicitly returned rule key against approved tenant rules."""
    if not rule_key:
        return None
    rows = conn.execute(
        """SELECT r.id, r.key
           FROM rules r
           JOIN rule_versions rv ON rv.id = r.current_version_id
           WHERE r.org_id = %s AND rv.status = 'approved'""",
        (org_id,),
    ).fetchall()

    for r in rows:
        if rule_key.strip() == r["key"]:
            return {"rule_id": str(r["id"]), "fact_id": None}
    return None
