"""T10 – Claim-to-Fact Linking and Deterministic Checks.

Given a content_version_id, loads claims, links them to approved facts,
runs deterministic checks, inserts findings, and returns a summary.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from psycopg.types.json import Jsonb

from ..core.db import tenant_conn
from .claim_extractor import extract_claims

# Tolerance for numeric value matching (±5%)
NUMERIC_TOLERANCE = 0.05


def _to_date(v) -> Optional[date]:
    if v is None:
        return None
    if isinstance(v, date):
        return v
    if isinstance(v, datetime):
        return v.date()
    return None


def run_checks(content_version_id: str, org_id: str, user_id: str) -> Dict[str, Any]:
    """Main entry point: run all deterministic checks for a content version."""
    with tenant_conn(org_id, user_id) as conn:
        # Load the content version
        cv = conn.execute(
            "SELECT id, content_item_id, body_text FROM content_versions WHERE id=%s",
            (content_version_id,),
        ).fetchone()
        if not cv:
            raise ValueError(f"content_version {content_version_id} not found")

        body_text = cv["body_text"]

        # Re-extract claims (or load existing ones)
        existing_claims = conn.execute(
            "SELECT id FROM content_claims WHERE content_version_id=%s", (content_version_id,)
        ).fetchall()

        if not existing_claims:
            raw_claims = extract_claims(body_text)
            claim_ids = _insert_claims(conn, org_id, content_version_id, raw_claims)
        else:
            claim_ids = [str(r["id"]) for r in existing_claims]

        # Load all claims
        claims = conn.execute(
            """SELECT id, span_start, span_end, raw_text, entity, value_number, value_unit, qualifier
               FROM content_claims WHERE content_version_id=%s""",
            (content_version_id,),
        ).fetchall()

        # Load all approved facts for this tenant
        facts = conn.execute(
            """SELECT f.id, f.key, f.category,
                      fv.id as fv_id, fv.version_no, fv.value_text, fv.value_number,
                      fv.value_unit, fv.qualifier, fv.expires_at, fv.valid_from, fv.status as fv_status
               FROM facts f
               JOIN fact_versions fv ON fv.id = f.current_version_id
               WHERE f.org_id=%s AND fv.status='approved'""",
            (org_id,),
        ).fetchall()

        # Load fact aliases
        aliases = conn.execute(
            "SELECT fact_id, alias_text, kind FROM fact_aliases WHERE org_id=%s", (org_id,)
        ).fetchall()
        alias_map: Dict[str, List[dict]] = {}
        for a in aliases:
            fid = str(a["fact_id"])
            alias_map.setdefault(fid, []).append({"text": a["alias_text"].lower(), "kind": a["kind"]})

        # Load embargo terms
        embargo_terms = conn.execute(
            "SELECT term, embargo_until, fact_id FROM embargo_terms WHERE org_id=%s", (org_id,)
        ).fetchall()

        # Load banned forms rule ids
        r04 = conn.execute("SELECT id FROM rules WHERE org_id=%s AND key='R-04'", (org_id,)).fetchone()
        r07 = conn.execute("SELECT id FROM rules WHERE org_id=%s AND key='R-07'", (org_id,)).fetchone()
        r12 = conn.execute("SELECT id FROM rules WHERE org_id=%s AND key='R-12'", (org_id,)).fetchone()

        # Create analysis run
        run_id = uuid.uuid4()
        conn.execute(
            """INSERT INTO analysis_runs
               (id, org_id, content_version_id, kind, status, started_at, created_by)
               VALUES (%s,%s,%s,'review','running',now(),%s)""",
            (run_id, org_id, content_version_id, user_id),
        )

        findings = []
        linked_count = 0
        today = date.today()

        # ── Embargo check on raw text ──
        for et in embargo_terms:
            term = et["term"]
            embargo_date = _to_date(et["embargo_until"])
            if term.lower() in body_text.lower():
                if embargo_date and today < embargo_date:
                    fid = uuid.uuid4()
                    findings.append({
                        "id": str(fid),
                        "issue": f"Embargoed term '{term}' found in content before embargo date {embargo_date}",
                        "severity": "critical",
                        "finding_type": "confirmed",
                        "source_kind": "deterministic",
                        "rule_id": str(r12["id"]) if r12 else None,
                        "fact_id": str(et["fact_id"]) if et["fact_id"] else None,
                        "human_review_required": True,
                    })

        # ── Per-claim checks ──
        for claim in claims:
            claim_id = str(claim["id"])
            raw = claim["raw_text"].lower()
            entity = claim["entity"] or ""
            claim_val = claim["value_number"]

            # Check banned product name forms
            if entity == "product_name" or any(
                banned in raw for banned in ["nimbus desk", "nimbusdesk"]
                if "nimbus desk" in raw.lower() or "nimbus desk" in raw.lower()
            ):
                if "nimbus desk" in raw.lower() or "nimbusdesk" in raw.lower():
                    _check_banned_form(raw, findings, r04)

            # Try to link claim to a fact
            matched_fact = None
            matched_alias_kind = None

            for fact in facts:
                fid = str(fact["id"])

                # Match by entity key
                if entity == fact["key"] or entity == fact["category"]:
                    matched_fact = fact
                    break

                # Match by alias surface forms
                for alias in alias_map.get(fid, []):
                    if alias["text"] in raw:
                        matched_fact = fact
                        matched_alias_kind = alias["kind"]
                        break

                # Match by numeric value
                if matched_fact is None and claim_val is not None and fact["value_number"] is not None:
                    fval = float(fact["value_number"])
                    if fval > 0 and abs(claim_val - fval) / fval <= NUMERIC_TOLERANCE:
                        matched_fact = fact
                        break

                if matched_fact:
                    break

            if matched_fact:
                linked_count += 1
                fact_id = str(matched_fact["id"])
                fact_val = matched_fact["value_number"]
                expires = _to_date(matched_fact["expires_at"])

                # Update claim with link
                conn.execute(
                    """UPDATE content_claims
                       SET fact_id=%s, fact_version_no=%s, link_status='auto', link_score=0.9
                       WHERE id=%s""",
                    (fact_id, matched_fact["version_no"], claim["id"]),
                )

                # Check: banned form used
                if matched_alias_kind == "banned_form":
                    findings.append({
                        "id": str(uuid.uuid4()),
                        "issue": f"Banned form used: '{claim['raw_text']}'. Use the approved form instead.",
                        "severity": "high",
                        "finding_type": "confirmed",
                        "source_kind": "deterministic",
                        "rule_id": str(r04["id"]) if r04 else None,
                        "fact_id": fact_id,
                        "span_start": claim["span_start"],
                        "span_end": claim["span_end"],
                    })

                # Check: value mismatch
                if (claim_val is not None and fact_val is not None
                        and abs(float(claim_val) - float(fact_val)) / max(float(fact_val), 1) > NUMERIC_TOLERANCE):
                    findings.append({
                        "id": str(uuid.uuid4()),
                        "issue": (f"Value mismatch: content says '{claim['raw_text']}' "
                                  f"but approved fact is '{matched_fact['value_text']}'"),
                        "severity": "high",
                        "finding_type": "confirmed",
                        "source_kind": "deterministic",
                        "rule_id": str(r07["id"]) if r07 else None,
                        "fact_id": fact_id,
                        "span_start": claim["span_start"],
                        "span_end": claim["span_end"],
                    })

                # Check: expired fact
                if expires and today > expires:
                    findings.append({
                        "id": str(uuid.uuid4()),
                        "issue": f"Fact '{matched_fact['key']}' expired on {expires}. Content may be outdated.",
                        "severity": "high",
                        "finding_type": "confirmed",
                        "source_kind": "deterministic",
                        "fact_id": fact_id,
                        "span_start": claim["span_start"],
                        "span_end": claim["span_end"],
                    })

        # Check for superseded fact references
        _check_superseded(conn, org_id, content_version_id, body_text, findings)

        # Insert all findings
        for f in findings:
            conn.execute(
                """INSERT INTO findings
                   (id, org_id, analysis_run_id, content_version_id, span_start, span_end,
                    finding_type, source_kind, rule_id, fact_id, issue, severity, confidence,
                    human_review_required, status)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'high',%s,'open')""",
                (
                    f.get("id", str(uuid.uuid4())),
                    org_id,
                    run_id,
                    content_version_id,
                    f.get("span_start"),
                    f.get("span_end"),
                    f.get("finding_type", "confirmed"),
                    f.get("source_kind", "deterministic"),
                    f.get("rule_id"),
                    f.get("fact_id"),
                    f["issue"],
                    f.get("severity", "high"),
                    f.get("human_review_required", False),
                ),
            )

        # Mark run done
        conn.execute(
            "UPDATE analysis_runs SET status='done', finished_at=now() WHERE id=%s", (run_id,)
        )

    return {
        "run_id": str(run_id),
        "total_claims": len(list(claims)),
        "linked": linked_count,
        "findings_count": len(findings),
        "findings": findings,
    }


def _insert_claims(conn, org_id, content_version_id, raw_claims) -> List[str]:
    ids = []
    for c in raw_claims:
        cid = uuid.uuid4()
        conn.execute(
            """INSERT INTO content_claims
               (id, org_id, content_version_id, span_start, span_end, raw_text,
                entity, value_number, value_unit, qualifier)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (
                cid,
                org_id,
                content_version_id,
                c["span_start"],
                c["span_end"],
                c["raw_text"],
                c["entity"],
                c["value_number"],
                c["value_unit"],
                c["qualifier"],
            ),
        )
        ids.append(str(cid))
    return ids


def _check_banned_form(raw: str, findings: list, r04):
    """Add a finding if a banned product name form is used."""
    findings.append({
        "id": str(uuid.uuid4()),
        "issue": f"Banned product name form used: '{raw}'. Approved form is 'NimbusDesk'.",
        "severity": "high",
        "finding_type": "confirmed",
        "source_kind": "deterministic",
        "rule_id": str(r04["id"]) if r04 else None,
    })


def _check_superseded(conn, org_id, content_version_id, body_text: str, findings: list):
    """Check if content references values from superseded fact versions."""
    superseded = conn.execute(
        """SELECT fv.value_text, fv.value_number, f.key, fv.fact_id
           FROM fact_versions fv
           JOIN facts f ON f.id = fv.fact_id
           WHERE fv.org_id=%s AND fv.status='superseded' AND fv.value_number IS NOT NULL""",
        (org_id,),
    ).fetchall()

    for sv in superseded:
        if sv["value_text"] and sv["value_text"].split(",")[0].replace("+", "").replace(" ", "").isdigit():
            # Check if the old value text appears in body
            old_val_str = str(int(sv["value_number"])) if sv["value_number"] else None
            if old_val_str and old_val_str in body_text.replace(",", ""):
                findings.append({
                    "id": str(uuid.uuid4()),
                    "issue": (f"Content references a superseded value for '{sv['key']}': "
                              f"'{sv['value_text']}'. The approved value has been updated."),
                    "severity": "high",
                    "finding_type": "confirmed",
                    "source_kind": "deterministic",
                    "fact_id": str(sv["fact_id"]),
                })
