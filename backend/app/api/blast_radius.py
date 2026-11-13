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
import re
import os
import math
from typing import Optional

from fastapi import APIRouter, Depends
from psycopg.types.json import Jsonb

from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, require
from ..services.claim_extractor import extract_claims, normalise_number
from ..services.offline_candidates import offline_candidate

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


def _scan_item(body: str, old_norm: Optional[float], old_text: str, new_text: str,
               fact_attribute: Optional[str], linked_fact_id: Optional[str],
               fact_id_str: str,
               linked_claim_spans: Optional[set[tuple[int, int]]] = None,
               new_norm: Optional[float] = None) -> Optional[dict]:
    """
    Scan a single content body.
    Returns a match dict or None.
    match_type: 'confirmed' | 'possible'
    """
    claims = extract_claims(body)
    possible_match = None
    for claim in claims:
        c_val = claim["value_number"]
        c_attr = claim["attribute"]

        # Exact numeric match after normalisation (no tolerance)
        if c_val is not None and old_norm is not None and c_val == old_norm:
            # confirmed if attribute matches OR claim is already linked to this fact
            explicitly_linked = (linked_fact_id and linked_fact_id == fact_id_str) or (
                linked_claim_spans is not None
                and (claim["span_start"], claim["span_end"]) in linked_claim_spans
            )
            result = {
                "match_type": (
                    "confirmed"
                    if ((fact_attribute and c_attr == fact_attribute) or explicitly_linked)
                    and (new_norm is None or new_norm != old_norm)
                    else "possible"
                ),
                "stale_text": claim["raw_text"],
                "span_start": claim["span_start"],
                "span_end": claim["span_end"],
                "suggested_replacement": new_text,
            }
            if result["match_type"] == "confirmed":
                return result
            if possible_match is None:
                possible_match = result
    if possible_match:
        return possible_match
    # Exact text can reveal non-numeric facts, but a string match alone does not
    # establish that the passage makes this claim or that it is stale.
    text = old_text.strip()
    if text and text.casefold() != new_text.strip().casefold():
        pattern = r'(?<!\w)' + re.escape(text) + r'(?!\w)'
        match = re.search(pattern, body, re.IGNORECASE)
        if match:
            return {"match_type": "possible", "stale_text": match.group(),
                    "span_start": match.start(), "span_end": match.end(),
                    "suggested_replacement": new_text}
    return None


def _historical_vector_candidates(conn, org_id, fact_id, version_id):
    """Select provenance-matched candidates against the superseded fact version.

    These are similarities, not determinations that a passage is stale. No
    embeddings are generated here; unlabelled and stale inputs are ignored.
    """
    if os.environ.get('GRAPH_VECTOR_MATCH_ENABLED', '').lower() != 'true':
        return {}
    rows = conn.execute("""SELECT cc.content_version_id, cc.span_start, cc.span_end,
               cc.raw_text, cc.embedding_model, 1-(fv.embedding <=> cc.embedding) AS score
        FROM fact_versions fv
        JOIN facts f ON f.id=fv.fact_id AND f.org_id=fv.org_id
        JOIN content_claims cc ON cc.org_id=fv.org_id
        JOIN content_versions cv ON cv.id=cc.content_version_id AND cv.org_id=cc.org_id
        JOIN content_items ci ON ci.id=cv.content_item_id AND ci.org_id=cc.org_id
            AND ci.current_version_id=cv.id
        WHERE fv.org_id=%s AND fv.fact_id=%s AND fv.id=%s AND fv.status='superseded'
          AND fv.embedding IS NOT NULL AND fv.embedding_model IS NOT NULL
          AND fv.embedding_model <> '' AND fv.embedding_input=f.label || chr(10) || fv.value_text
          AND cc.embedding IS NOT NULL AND cc.embedding_model=fv.embedding_model
          AND cc.embedding_input=cc.raw_text
          AND cc.span_start >= 0 AND cc.span_end > cc.span_start
          AND substring(cv.body_text FROM cc.span_start + 1 FOR cc.span_end - cc.span_start)=cc.raw_text
          AND 1-(fv.embedding <=> cc.embedding) >= 0.85
        ORDER BY cc.content_version_id, score DESC, cc.span_start, cc.id""",
        (org_id, fact_id, version_id)).fetchall()
    candidates = {}
    for row in rows:
        score = float(row['score'])
        if not math.isfinite(score) or not 0.85 <= score <= 1.000001:
            continue
        key = str(row['content_version_id'])
        candidates.setdefault(key, {'match_type': 'possible', 'stale_text': row['raw_text'],
            'span_start': row['span_start'], 'span_end': row['span_end'],
            'match_method': 'embedding', 'similarity': score, 'embedding_model': row['embedding_model']})
    return candidates


@router.post("/facts/{fact_id}/blast-radius")
def run_blast_radius(fact_id: uuid.UUID, principal: Principal = Depends(require("view_repository"))):
    fact_id_str = str(fact_id)
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        # Current (new) approved version
        fact = conn.execute(
            """SELECT f.id, f.key, f.label, f.category,
                      fv.value_text as new_value_text, fv.value_number as new_value_number
               FROM facts f
               JOIN fact_versions fv ON fv.id = f.current_version_id AND fv.org_id=f.org_id
               WHERE f.id=%s AND f.org_id=%s AND fv.status='approved'""",
            (fact_id, principal.org_id),
        ).fetchone()
        if not fact:
            raise ApiError(404, "not_found", "Fact not found")

        # Previous superseded version
        prev = conn.execute(
            """SELECT id, value_text, value_number
               FROM fact_versions
               WHERE fact_id=%s AND org_id=%s AND status='superseded'
               ORDER BY approved_at DESC NULLS LAST, version_no DESC LIMIT 1""",
            (fact_id, principal.org_id),
        ).fetchone()

        if not prev:
            return {
                "fact_id": fact_id_str,
                "fact_key": fact["key"],
                "fact_label": fact["label"],
                "message": "No previous approved version is available for comparison.",
                "scan_performed": False,
                "affected": [],
                "affected_count": 0,
                "summary": {"confirmed": 0, "possible": 0,
                            "by_status": {"draft": 0, "in_review": 0, "scheduled": 0, "published": 0}},
                "scope_note": "No scan was performed. Approve a new fact version before comparing it with the previous version.",
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
               JOIN content_versions cv ON cv.id = ci.current_version_id AND cv.org_id=ci.org_id
               WHERE ci.org_id=%s""",
            (principal.org_id,),
        ).fetchall()

        # Load existing claim-to-fact links for this fact
        linked_claim_spans_by_version: dict[str, set[tuple[int, int]]] = {}
        linked_rows = conn.execute(
            """SELECT cc.content_version_id, cc.span_start, cc.span_end
               FROM content_claims cc
               WHERE cc.org_id=%s AND cc.fact_id=%s AND cc.link_status='confirmed'""",
            (principal.org_id, fact_id),
        ).fetchall()
        for r in linked_rows:
            linked_claim_spans_by_version.setdefault(
                str(r["content_version_id"]), set()
            ).add((r["span_start"], r["span_end"]))

        vector_candidates = _historical_vector_candidates(conn, principal.org_id, fact_id, prev['id'])

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
            match = _scan_item(
                body, old_norm, old_text, new_text,
                fact_attribute,
                None,
                fact_id_str,
                linked_claim_spans_by_version.get(str(ci["cv_id"]), set()),
                _normalise_old_value(new_text, fact["new_value_number"]),
            )
            if not match:
                vector_match = vector_candidates.get(str(ci['cv_id']))
                if vector_match:
                    match = {**vector_match, 'suggested_replacement': new_text}
            if not match:
                candidate = offline_candidate(body, old_text, new_text)
                if candidate:
                    match = {**candidate, 'suggested_replacement': new_text}
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
                    "match_method": match.get("match_method", "deterministic"),
                    "similarity": match.get("similarity"),
                    "embedding_model": match.get("embedding_model"),
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
            "scan_performed": True,
            "affected_count": len(affected),
            "affected": affected,
            "summary": summary_counts,
            "scope_note": "Only current versions of content registered in BrandGuard were scanned. Matching is incomplete; no matches does not prove content is current. Offline lexical candidates and vector similarity are experimental, uncalibrated and require human review.",
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
