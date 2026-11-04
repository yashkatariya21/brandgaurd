"""Findings API – list findings and record decisions."""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..core.audit import write_audit
from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, require

router = APIRouter(prefix="/v1")


class DecideBody(BaseModel):
    action: str  # accept | edit | dismiss | escalate
    reason_code: Optional[str] = None
    reason_text: Optional[str] = None
    final_text: Optional[str] = None


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


@router.get("/findings")
def list_findings(principal: Principal = Depends(require("decide_findings"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rows = conn.execute(
            """SELECT f.id, f.issue, f.severity, f.finding_type, f.source_kind,
                      f.status, f.created_at, f.span_start, f.span_end,
                      f.rule_id, f.fact_id, f.human_review_required,
                      cv.content_item_id,
                      ci.title as content_title
               FROM findings f
               JOIN content_versions cv ON cv.id = f.content_version_id
               JOIN content_items ci ON ci.id = cv.content_item_id
               WHERE f.org_id=%s
               ORDER BY
                 CASE f.severity
                   WHEN 'critical' THEN 1
                   WHEN 'high' THEN 2
                   WHEN 'medium' THEN 3
                   ELSE 4
                 END,
                 f.created_at DESC""",
            (principal.org_id,),
        ).fetchall()
    return [_serialize(dict(r)) for r in rows]


@router.get("/findings/{finding_id}")
def get_finding(finding_id: uuid.UUID, principal: Principal = Depends(require("decide_findings"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        f = conn.execute(
            """SELECT f.*, ci.title as content_title
               FROM findings f
               JOIN content_versions cv ON cv.id = f.content_version_id
               JOIN content_items ci ON ci.id = cv.content_item_id
               WHERE f.id=%s AND f.org_id=%s""",
            (finding_id, principal.org_id),
        ).fetchone()
        if not f:
            raise ApiError(404, "not_found", "Finding not found")
        decisions = conn.execute(
            "SELECT * FROM decisions WHERE finding_id=%s ORDER BY decided_at DESC",
            (finding_id,),
        ).fetchall()
        debate = conn.execute(
            "SELECT * FROM debates WHERE finding_id=%s AND org_id=%s",
            (finding_id, principal.org_id),
        ).fetchone()
    result = {
        **_serialize(dict(f)),
        "decisions": [_serialize(dict(d)) for d in decisions],
    }
    if debate:
        result["debate"] = _serialize(dict(debate))
    return result


@router.post("/findings/{finding_id}/decide")
def decide_finding(finding_id: uuid.UUID, body: DecideBody,
                   principal: Principal = Depends(require("decide_findings"))):
    valid_actions = ("accept", "edit", "dismiss", "escalate")
    if body.action not in valid_actions:
        raise ApiError(400, "bad_request", f"action must be one of {valid_actions}")

    valid_reason_codes = ("not_applicable", "intended_meaning", "rule_unclear", "evidence_wrong", "other")
    if body.action == "dismiss" and not body.reason_code:
        raise ApiError(400, "bad_request", "reason_code is required when dismissing")
    if body.reason_code and body.reason_code not in valid_reason_codes:
        raise ApiError(400, "bad_request", f"reason_code must be one of {valid_reason_codes}")

    decision_id = uuid.uuid4()
    # Map action to finding status
    status_map = {
        "accept": "accepted",
        "edit": "edited",
        "dismiss": "dismissed",
        "escalate": "escalated",
    }
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        f = conn.execute(
            "SELECT id FROM findings WHERE id=%s AND org_id=%s", (finding_id, principal.org_id)
        ).fetchone()
        if not f:
            raise ApiError(404, "not_found", "Finding not found")

        conn.execute(
            """INSERT INTO decisions
               (id, org_id, finding_id, decided_by, action, reason_code, reason_text, final_text)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
            (decision_id, principal.org_id, finding_id, principal.user_id,
             body.action, body.reason_code, body.reason_text, body.final_text),
        )
        conn.execute(
            "UPDATE findings SET status=%s WHERE id=%s",
            (status_map[body.action], finding_id),
        )
        write_audit(conn, principal.user_id, f"finding.{body.action}", "finding", finding_id,
                    after={"action": body.action, "reason_code": body.reason_code})
    return {"decision_id": str(decision_id), "finding_status": status_map[body.action]}
