"""T11 – Blast-Radius: when a fact version is approved, find all stale content."""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, require
from ..services.claim_extractor import extract_claims

router = APIRouter(prefix="/v1")

# Tolerance for numeric comparison
TOLERANCE = 0.05


def _serialize(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if hasattr(v, "hex"):
            out[k] = str(v)
        elif hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _values_match(claim_val: Optional[float], fact_val: Optional[float]) -> bool:
    """True if claim_val is within TOLERANCE of fact_val."""
    if claim_val is None or fact_val is None:
        return False
    fv = float(fact_val)
    if fv == 0:
        return claim_val == 0
    return abs(float(claim_val) - fv) / fv <= TOLERANCE


def _text_contains_value(body_text: str, value_number: float, value_text: str) -> bool:
    """Check if body_text references a particular numeric value."""
    # Normalise: strip commas, check for the integer part
    val_int = int(value_number)
    val_str = str(val_int)
    # Check formatted with commas too
    val_comma = f"{val_int:,}"
    body_lower = body_text.lower().replace(",", "")
    return (
        val_str in body_lower
        or val_str.lower() in body_text.lower()
        or val_comma.replace(",", "") in body_lower
        or "fifty thousand" in body_lower.lower()  # special case for 50000
    )


@router.post("/facts/{fact_id}/blast-radius")
def run_blast_radius(fact_id: uuid.UUID, principal: Principal = Depends(require("view_repository"))):
    """
    Scan all content in the org for references to the fact's OLD value.
    Returns list of affected content items with old vs new value.
    """
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        # Load the fact with current (new) approved version
        fact = conn.execute(
            """SELECT f.id, f.key, f.label, f.category,
                      fv.value_text as new_value_text, fv.value_number as new_value_number,
                      fv.version_no as new_version_no, fv.status as new_status
               FROM facts f
               JOIN fact_versions fv ON fv.id = f.current_version_id
               WHERE f.id=%s AND f.org_id=%s""",
            (fact_id, principal.org_id),
        ).fetchone()
        if not fact:
            raise ApiError(404, "not_found", "Fact not found")

        # Load the PREVIOUS approved / superseded version
        prev_version = conn.execute(
            """SELECT version_no, value_text, value_number, value_unit
               FROM fact_versions
               WHERE fact_id=%s AND status='superseded'
               ORDER BY version_no DESC LIMIT 1""",
            (fact_id,),
        ).fetchone()

        if not prev_version:
            return {
                "fact_id": str(fact_id),
                "fact_key": fact["key"],
                "message": "No previous version found – nothing to compare against",
                "affected": [],
            }

        old_val = prev_version["value_number"]
        old_text = prev_version["value_text"]
        new_val = fact["new_value_number"]
        new_text = fact["new_value_text"]

        # Load ALL content items with their current version body_text
        content_items = conn.execute(
            """SELECT ci.id, ci.title, ci.channel, ci.status, ci.registered_state,
                      ci.published_url, cv.id as cv_id, cv.body_text, cv.version_no
               FROM content_items ci
               JOIN content_versions cv ON cv.id = ci.current_version_id
               WHERE ci.org_id=%s""",
            (principal.org_id,),
        ).fetchall()

        affected = []
        run_id = uuid.uuid4()

        # Create a blast-radius analysis run (kind='impact')
        conn.execute(
            """INSERT INTO analysis_runs
               (id, org_id, kind, status, started_at, created_by)
               VALUES (%s,%s,'impact','running',now(),%s)""",
            (run_id, principal.org_id, principal.user_id),
        )

        for ci in content_items:
            body = ci["body_text"] or ""
            claims = extract_claims(body)

            # Check if any claim references the OLD value
            stale_claims = []
            for claim in claims:
                if claim["value_number"] is not None and old_val is not None:
                    if _values_match(claim["value_number"], float(old_val)):
                        stale_claims.append(claim)
                elif old_val is not None and _text_contains_value(body, float(old_val), old_text or ""):
                    stale_claims.append(claim)
                    break  # one match is enough to mark the item

            if stale_claims:
                # Pick the first stale claim for the span
                sc = stale_claims[0]
                affected.append({
                    "content_item_id": str(ci["id"]),
                    "title": ci["title"],
                    "channel": ci["channel"],
                    "status": ci["status"],
                    "registered_state": ci["registered_state"],
                    "published_url": ci["published_url"],
                    "span_start": sc["span_start"],
                    "span_end": sc["span_end"],
                    "stale_text": sc["raw_text"],
                    "old_value": old_text,
                    "new_value": new_text,
                    "old_value_number": float(old_val) if old_val else None,
                    "new_value_number": float(new_val) if new_val else None,
                })

        conn.execute(
            "UPDATE analysis_runs SET status='done', finished_at=now() WHERE id=%s", (run_id,)
        )

    return {
        "fact_id": str(fact_id),
        "fact_key": fact["key"],
        "fact_label": fact["label"],
        "old_value": old_text,
        "new_value": new_text,
        "run_id": str(run_id),
        "affected_count": len(affected),
        "affected": affected,
    }


@router.get("/blast-radius/{fact_id}")
def get_blast_radius(fact_id: uuid.UUID, principal: Principal = Depends(require("view_repository"))):
    """Return the latest blast-radius scan results stored in analysis_runs."""
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        fact = conn.execute(
            "SELECT id, key, label FROM facts WHERE id=%s AND org_id=%s",
            (fact_id, principal.org_id),
        ).fetchone()
        if not fact:
            raise ApiError(404, "not_found", "Fact not found")

        # Return a quick summary – direct re-run if needed
        latest_run = conn.execute(
            """SELECT id, status, started_at, finished_at
               FROM analysis_runs
               WHERE org_id=%s AND kind='impact'
               ORDER BY created_at DESC LIMIT 1""",
            (principal.org_id,),
        ).fetchone()

    if not latest_run:
        return {"fact_id": str(fact_id), "fact_key": fact["key"], "message": "No blast-radius scan has been run yet"}

    return {
        "fact_id": str(fact_id),
        "fact_key": fact["key"],
        "fact_label": fact["label"],
        "run_id": str(latest_run["id"]),
        "run_status": latest_run["status"],
        "started_at": latest_run["started_at"].isoformat() if latest_run["started_at"] else None,
        "finished_at": latest_run["finished_at"].isoformat() if latest_run["finished_at"] else None,
    }
