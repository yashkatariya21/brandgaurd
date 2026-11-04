"""T11 – Blast-Radius: scan all registered content for references to an OLD fact value.

Match types
-----------
confirmed  – normalised value matches AND claim attribute matches the fact's attribute
             (or the claim is already linked to this fact via content_claims.fact_id).
possible   – value matches but attribute is different or missing
             (e.g. A-05 "50,000 tickets" matches numerically but is about ticket_volume
             not customer_count).

Scope note: only content registered in BrandGuard is scanned.
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from psycopg.types.json import Jsonb

from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, require
from ..services.claim_extractor import extract_claims, normalise_number

router = APIRouter(prefix="/v1")

# ─── Fact-key → canonical attribute mapping ──────────────────────────────────
# Must match the attribute names produced by claim_extractor.
_FACT_KEY_TO_ATTRIBUTE: dict[str, str] = {
    "customer_count": "customer_count",
    "starter_price": "price_per_agent_month",
    "pro_price": "price_per_agent_month",
    "uptime_sla": "uptime_percent",
    "first_response": "first_response",
    "integrations": "integrations",
    "languages": "languages",
    "free_trial": "free_trial",
}


def _serialize(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if v is None:
            out[k] = v
        elif hasattr(v, "hex"):
            out[k] = str(v)
        elif hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _normalise_old_value(value_text: str, value_number: Optional[float]) -> Optional[float]:
    """Return the canonical float for the OLD fact value."""
    if value_number is not None:
        return float(value_number)
    if value_text:
        return normalise_number(value_text.replace("+", ""))
    return None


def _scan_item(body: str, old_norm: float, old_text: str, new_text: str,
               fact_attribute: Optional[str], linked_fact_id: Optional[str],
               fact_id_str: str) -> Optional[dict]:
    """
    Scan a single content body.
    Returns a match dict or None.
    match_type: 'confirmed' | 'possible'
    """
    claims = extract_claims(body)
    for claim in claims:
        c_val = claim["value_number"]
        c_attr = claim["attribute"]

        # Exact numeric match after normalisation (no tolerance)
        if c_val is not None and old_norm is not None and c_val == old_norm:
            # confirmed if attribute matches OR claim is already linked to this fact
            if (fact_attribute and c_attr == fact_attribute) or \
               (linked_fact_id and linked_fact_id == fact_id_str):
                return {
                    "match_type": "confirmed",
                    "stale_text": claim["raw_text"],
                    "span_start": claim["span_start"],
                    "span_end": claim["span_end"],
                    "suggested_replacement": new_text,
                }
            else:
                # Value matches but attribute differs → possible
                return {
                    "match_type": "possible",
                    "stale_text": claim["raw_text"],
                    "span_start": claim["span_start"],
                    "span_end": claim["span_end"],
                    "suggested_replacement": new_text,
                }
    return None


@router.post("/facts/{fact_id}/blast-radius")
def run_blast_radius(fact_id: uuid.UUID, principal: Principal = Depends(require("view_repository"))):
    fact_id_str = str(fact_id)
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        # Current (new) approved version
        fact = conn.execute(
            """SELECT f.id, f.key, f.label, f.category,
                      fv.value_text as new_value_text, fv.value_number as new_value_number
               FROM facts f
               JOIN fact_versions fv ON fv.id = f.current_version_id
               WHERE f.id=%s AND f.org_id=%s""",
            (fact_id, principal.org_id),
        ).fetchone()
        if not fact:
            raise ApiError(404, "not_found", "Fact not found")

        # Previous superseded version
        prev = conn.execute(
            """SELECT value_text, value_number
               FROM fact_versions
               WHERE fact_id=%s AND status='superseded'
               ORDER BY version_no DESC LIMIT 1""",
            (fact_id,),
        ).fetchone()

        if not prev:
            return {
                "fact_id": fact_id_str,
                "fact_key": fact["key"],
                "fact_label": fact["label"],
                "message": "No previous version found – nothing to compare against",
                "affected": [],
                "affected_count": 0,
                "summary": {"confirmed": 0, "possible": 0,
                            "by_status": {"draft": 0, "in_review": 0, "scheduled": 0, "published": 0}},
                "scope_note": "Only content registered in BrandGuard was scanned.",
            }

        old_text = prev["value_text"] or ""
        old_norm = _normalise_old_value(old_text, prev["value_number"])
        new_text = fact["new_value_text"] or ""
        fact_attribute = _FACT_KEY_TO_ATTRIBUTE.get(fact["key"])

        # Load all content with current version text
        items = conn.execute(
            """SELECT ci.id, ci.title, ci.channel, ci.status, ci.registered_state,
                      ci.published_url, cv.id as cv_id, cv.body_text
               FROM content_items ci
               JOIN content_versions cv ON cv.id = ci.current_version_id
               WHERE ci.org_id=%s""",
            (principal.org_id,),
        ).fetchall()

        # Load existing claim-to-fact links for this fact
        linked_version_ids = set()
        linked_rows = conn.execute(
            """SELECT cc.content_version_id
               FROM content_claims cc
               WHERE cc.fact_id=%s AND cc.link_status IN ('auto','confirmed')""",
            (fact_id,),
        ).fetchall()
        for r in linked_rows:
            linked_version_ids.add(str(r["content_version_id"]))

        run_id = uuid.uuid4()
        conn.execute(
            """INSERT INTO analysis_runs
               (id, org_id, kind, status, started_at, created_by)
               VALUES (%s,%s,'impact','running',now(),%s)""",
            (run_id, principal.org_id, principal.user_id),
        )

        affected = []
        summary_counts = {"confirmed": 0, "possible": 0,
                          "by_status": {"draft": 0, "in_review": 0, "scheduled": 0, "published": 0}}

        for ci in items:
            body = ci["body_text"] or ""
            linked = str(ci["cv_id"]) in linked_version_ids

            match = _scan_item(
                body, old_norm, old_text, new_text,
                fact_attribute,
                fact_id_str if linked else None,
                fact_id_str,
            )
            if match:
                reg = ci["registered_state"] or "none"
                status_key = reg if reg in ("scheduled", "published") else \
                    ("in_review" if ci["status"] == "in_review" else "draft")
                summary_counts[match["match_type"]] += 1
                summary_counts["by_status"][status_key] = \
                    summary_counts["by_status"].get(status_key, 0) + 1

                affected.append({
                    "content_item_id": str(ci["id"]),
                    "title": ci["title"],
                    "channel": ci["channel"],
                    "status": ci["status"],
                    "registered_state": reg,
                    "published_url": ci["published_url"],
                    "match_type": match["match_type"],
                    "stale_text": match["stale_text"],
                    "span_start": match["span_start"],
                    "span_end": match["span_end"],
                    "old_value": old_text,
                    "new_value": new_text,
                    "suggested_replacement": match["suggested_replacement"],
                })

        # Sort: published first
        _order = {"published": 0, "scheduled": 1, "in_review": 2, "draft": 3, "none": 4}
        affected.sort(key=lambda x: _order.get(x["registered_state"], 5))

        result_json = {
            "fact_id": fact_id_str,
            "fact_key": fact["key"],
            "fact_label": fact["label"],
            "old_value": old_text,
            "new_value": new_text,
            "run_id": str(run_id),
            "affected_count": len(affected),
            "affected": affected,
            "summary": summary_counts,
            "scope_note": "Only content registered in BrandGuard was scanned.",
        }

        # Persist in analysis_runs.config so GET can return it
        conn.execute(
            "UPDATE analysis_runs SET status='done', finished_at=now(), config=%s WHERE id=%s",
            (Jsonb({"fact_id": fact_id_str, "result": result_json}), run_id),
        )

    return result_json


@router.get("/blast-radius/{fact_id}")
def get_blast_radius(fact_id: uuid.UUID, principal: Principal = Depends(require("view_repository"))):
    """Return the latest blast-radius result for a specific fact (persisted in analysis_runs.config)."""
    fact_id_str = str(fact_id)
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        fact = conn.execute(
            "SELECT id, key, label FROM facts WHERE id=%s AND org_id=%s",
            (fact_id, principal.org_id),
        ).fetchone()
        if not fact:
            raise ApiError(404, "not_found", "Fact not found")

        # Find the latest impact run for THIS fact
        run = conn.execute(
            """SELECT id, status, started_at, finished_at, config
               FROM analysis_runs
               WHERE org_id=%s AND kind='impact'
                 AND config->>'fact_id' = %s
               ORDER BY created_at DESC LIMIT 1""",
            (principal.org_id, fact_id_str),
        ).fetchone()

    if not run:
        return {
            "fact_id": fact_id_str,
            "fact_key": fact["key"],
            "fact_label": fact["label"],
            "message": "No blast-radius scan has been run for this fact yet",
        }

    cfg = run["config"] or {}
    result = cfg.get("result") or {}
    result["run_status"] = run["status"]
    result["started_at"] = run["started_at"].isoformat() if run["started_at"] else None
    result["finished_at"] = run["finished_at"].isoformat() if run["finished_at"] else None
    return result
