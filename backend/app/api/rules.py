"""T05 – Rules API: versions, approval, diff, separation of duties."""
from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends
from psycopg.types.json import Jsonb
from pydantic import BaseModel

from ..core.audit import write_audit
from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, require

router = APIRouter(prefix="/v1")


# ─── Pydantic models ──────────────────────────────────────────────────────────

class RuleCreate(BaseModel):
    key: str
    label: str
    category: str
    applies_to: List[str] = []
    severity: str
    description: str
    expected_behaviour: Optional[str] = None
    validation_criteria: Optional[str] = None
    change_note: Optional[str] = None


class RulePatch(BaseModel):
    label: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    applies_to: Optional[List[str]] = None


class RuleVersionPropose(BaseModel):
    description: str
    expected_behaviour: Optional[str] = None
    validation_criteria: Optional[str] = None
    change_note: Optional[str] = None


class RuleVersionEdit(BaseModel):
    description: Optional[str] = None
    expected_behaviour: Optional[str] = None
    validation_criteria: Optional[str] = None
    change_note: Optional[str] = None


class RejectBody(BaseModel):
    reason: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

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


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/rules")
def list_rules(principal: Principal = Depends(require("view_repository"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rows = conn.execute(
            """SELECT r.id, r.key, r.label, r.category, r.severity, r.applies_to, r.created_at,
                      rv.version_no, rv.description, rv.status as version_status
               FROM rules r
               LEFT JOIN rule_versions rv ON rv.id = r.current_version_id
               WHERE r.org_id = %s
               ORDER BY r.key""",
            (principal.org_id,),
        ).fetchall()
    return [_serialize(dict(r)) for r in rows]


@router.post("/rules", status_code=201)
def create_rule(body: RuleCreate, principal: Principal = Depends(require("propose_version"))):
    rule_id = uuid.uuid4()
    version_id = uuid.uuid4()
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        if conn.execute("SELECT 1 FROM rules WHERE org_id=%s AND key=%s", (principal.org_id, body.key)).fetchone():
            raise ApiError(409, "conflict", f"Rule key '{body.key}' already exists")
        conn.execute(
            """INSERT INTO rules (id, org_id, key, label, category, applies_to, severity, created_by)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
            (rule_id, principal.org_id, body.key, body.label, body.category,
             Jsonb(body.applies_to), body.severity, principal.user_id),
        )
        conn.execute(
            """INSERT INTO rule_versions
               (id, org_id, rule_id, version_no, description, expected_behaviour,
                validation_criteria, status, change_note, proposed_by)
               VALUES (%s,%s,%s,1,%s,%s,%s,'draft',%s,%s)""",
            (version_id, principal.org_id, rule_id, body.description, body.expected_behaviour,
             body.validation_criteria, body.change_note, principal.user_id),
        )
        write_audit(conn, principal.user_id, "rule.created", "rule", rule_id, after={"key": body.key})
    return {"rule_id": str(rule_id), "version_id": str(version_id)}


@router.get("/rules/{rule_id}")
def get_rule(rule_id: uuid.UUID, principal: Principal = Depends(require("view_repository"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rule = conn.execute(
            """SELECT r.*, rv.version_no, rv.description, rv.expected_behaviour,
                      rv.validation_criteria, rv.status as version_status,
                      rv.proposed_by, rv.approved_by, rv.approved_at, rv.change_note
               FROM rules r
               LEFT JOIN rule_versions rv ON rv.id = r.current_version_id
               WHERE r.id=%s AND r.org_id=%s""",
            (rule_id, principal.org_id),
        ).fetchone()
        if not rule:
            raise ApiError(404, "not_found", "Rule not found")
        versions = conn.execute(
            """SELECT id, version_no, description, expected_behaviour, validation_criteria,
                      status, change_note, proposed_by, approved_by, approved_at, created_at
               FROM rule_versions WHERE rule_id=%s ORDER BY version_no""",
            (rule_id,),
        ).fetchall()
        examples = conn.execute(
            """SELECT re.kind, re.text, re.human_label
               FROM rule_examples re
               JOIN rule_versions rv ON rv.id = re.rule_version_id
               WHERE rv.rule_id=%s""",
            (rule_id,),
        ).fetchall()
    return {
        **_serialize(dict(rule)),
        "versions": [_serialize(dict(v)) for v in versions],
        "examples": [dict(e) for e in examples],
    }


@router.patch("/rules/{rule_id}")
def patch_rule(rule_id: uuid.UUID, body: RulePatch, principal: Principal = Depends(require("propose_version"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise ApiError(400, "bad_request", "No fields to update")
    # applies_to needs Jsonb
    if "applies_to" in updates:
        updates["applies_to"] = Jsonb(updates["applies_to"])
    set_clause = ", ".join(f"{k}=%s" for k in updates)
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        result = conn.execute(
            f"UPDATE rules SET {set_clause} WHERE id=%s AND org_id=%s",
            [*updates.values(), rule_id, principal.org_id],
        )
        if result.rowcount == 0:
            raise ApiError(404, "not_found", "Rule not found")
        write_audit(conn, principal.user_id, "rule.patched", "rule", rule_id)
    return {"updated": True}


@router.post("/rules/{rule_id}/versions", status_code=201)
def propose_rule_version(rule_id: uuid.UUID, body: RuleVersionPropose,
                         principal: Principal = Depends(require("propose_version"))):
    version_id = uuid.uuid4()
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        if not conn.execute("SELECT 1 FROM rules WHERE id=%s AND org_id=%s", (rule_id, principal.org_id)).fetchone():
            raise ApiError(404, "not_found", "Rule not found")
        row = conn.execute(
            "SELECT COALESCE(MAX(version_no),0) as max_v FROM rule_versions WHERE rule_id=%s", (rule_id,)
        ).fetchone()
        next_v = row["max_v"] + 1
        conn.execute(
            """INSERT INTO rule_versions
               (id, org_id, rule_id, version_no, description, expected_behaviour,
                validation_criteria, status, change_note, proposed_by)
               VALUES (%s,%s,%s,%s,%s,%s,%s,'draft',%s,%s)""",
            (version_id, principal.org_id, rule_id, next_v, body.description,
             body.expected_behaviour, body.validation_criteria, body.change_note, principal.user_id),
        )
        write_audit(conn, principal.user_id, "rule_version.proposed", "rule_version", version_id,
                    after={"rule_id": str(rule_id), "version_no": next_v})
    return {"version_id": str(version_id), "version_no": next_v}


@router.patch("/rules/{rule_id}/versions/{version_no}")
def edit_rule_version(rule_id: uuid.UUID, version_no: int, body: RuleVersionEdit,
                      principal: Principal = Depends(require("propose_version"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        ver = conn.execute(
            "SELECT id, status, proposed_by FROM rule_versions WHERE rule_id=%s AND version_no=%s",
            (rule_id, version_no),
        ).fetchone()
        if not ver:
            raise ApiError(404, "not_found", "Version not found")
        if ver["status"] != "draft":
            raise ApiError(409, "immutable", "Version is no longer a draft")
        if str(ver["proposed_by"]) != principal.user_id:
            raise ApiError(403, "forbidden", "Only the proposer may edit a draft")
        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if not updates:
            raise ApiError(400, "bad_request", "No fields to update")
        set_clause = ", ".join(f"{k}=%s" for k in updates)
        conn.execute(f"UPDATE rule_versions SET {set_clause} WHERE id=%s", [*updates.values(), ver["id"]])
        write_audit(conn, principal.user_id, "rule_version.edited", "rule_version", ver["id"])
    return {"updated": True}


@router.post("/rules/{rule_id}/versions/{version_no}/submit")
def submit_rule_version(rule_id: uuid.UUID, version_no: int,
                        principal: Principal = Depends(require("propose_version"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        ver = conn.execute(
            "SELECT id, status FROM rule_versions WHERE rule_id=%s AND version_no=%s",
            (rule_id, version_no),
        ).fetchone()
        if not ver:
            raise ApiError(404, "not_found", "Version not found")
        if ver["status"] != "draft":
            raise ApiError(409, "wrong_status", f"Version is '{ver['status']}', expected 'draft'")
        conn.execute("UPDATE rule_versions SET status='pending_approval' WHERE id=%s", (ver["id"],))
        write_audit(conn, principal.user_id, "rule_version.submitted", "rule_version", ver["id"])
    return {"status": "pending_approval"}


@router.post("/rules/{rule_id}/versions/{version_no}/approve")
def approve_rule_version(rule_id: uuid.UUID, version_no: int,
                         principal: Principal = Depends(require("approve_version"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        ver = conn.execute(
            "SELECT id, status, proposed_by FROM rule_versions WHERE rule_id=%s AND version_no=%s",
            (rule_id, version_no),
        ).fetchone()
        if not ver:
            raise ApiError(404, "not_found", "Version not found")
        if ver["status"] != "pending_approval":
            raise ApiError(409, "wrong_status", f"Version is '{ver['status']}', expected 'pending_approval'")
        if str(ver["proposed_by"]) == principal.user_id:
            raise ApiError(403, "separation_of_duties", "Approver must be different from proposer")
        conn.execute(
            "UPDATE rule_versions SET status='superseded' WHERE rule_id=%s AND status='approved'",
            (rule_id,),
        )
        conn.execute(
            "UPDATE rule_versions SET status='approved', approved_by=%s, approved_at=now() WHERE id=%s",
            (principal.user_id, ver["id"]),
        )
        conn.execute("UPDATE rules SET current_version_id=%s WHERE id=%s", (ver["id"], rule_id))
        write_audit(conn, principal.user_id, "rule_version.approved", "rule_version", ver["id"])
    return {"status": "approved"}


@router.post("/rules/{rule_id}/versions/{version_no}/reject")
def reject_rule_version(rule_id: uuid.UUID, version_no: int, body: RejectBody = RejectBody(),
                        principal: Principal = Depends(require("approve_version"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        ver = conn.execute(
            "SELECT id, status FROM rule_versions WHERE rule_id=%s AND version_no=%s",
            (rule_id, version_no),
        ).fetchone()
        if not ver:
            raise ApiError(404, "not_found", "Version not found")
        if ver["status"] not in ("draft", "pending_approval"):
            raise ApiError(409, "wrong_status", "Only draft or pending_approval versions can be rejected")
        conn.execute("UPDATE rule_versions SET status='rejected' WHERE id=%s", (ver["id"],))
        write_audit(conn, principal.user_id, "rule_version.rejected", "rule_version", ver["id"],
                    after={"reason": body.reason})
    return {"status": "rejected"}


@router.get("/rules/{rule_id}/versions/{version_no}/diff")
def diff_rule_version(rule_id: uuid.UUID, version_no: int,
                      principal: Principal = Depends(require("view_repository"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        current = conn.execute(
            """SELECT description, expected_behaviour, validation_criteria, change_note, status
               FROM rule_versions WHERE rule_id=%s AND version_no=%s""",
            (rule_id, version_no),
        ).fetchone()
        if not current:
            raise ApiError(404, "not_found", "Version not found")
        previous = None
        if version_no > 1:
            previous = conn.execute(
                """SELECT description, expected_behaviour, validation_criteria, change_note, status
                   FROM rule_versions WHERE rule_id=%s AND version_no=%s""",
                (rule_id, version_no - 1),
            ).fetchone()

    FIELDS = ["description", "expected_behaviour", "validation_criteria", "change_note", "status"]
    diff = {}
    for f in FIELDS:
        before = previous[f] if previous else None
        after = current[f]
        if before != after:
            diff[f] = {"before": before, "after": after}
    return {"version_no": version_no, "diff": diff}
