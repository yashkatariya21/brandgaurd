"""T05 – Rules CRUD with versions and approval, mirrors facts API."""
import uuid
from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from psycopg.types.json import Jsonb

from ..core.audit import write_audit
from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, require

router = APIRouter(prefix="/v1")


class RuleIn(BaseModel):
    key: str = Field(min_length=2, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    label: str = Field(min_length=2, max_length=200)
    category: Literal["tone", "terminology", "claims", "accessibility", "embargo", "visual", "other"]
    severity: Literal["low", "medium", "high", "critical"]
    applies_to: list[str] = Field(default_factory=lambda: ["all"], max_length=20)
    description: str = Field(min_length=2, max_length=5000)
    expected_behaviour: Optional[str] = Field(default=None, max_length=2000)
    validation_criteria: Optional[str] = Field(default=None, max_length=2000)
    change_note: Optional[str] = Field(default=None, max_length=2000)


class RuleVersionIn(BaseModel):
    description: str = Field(min_length=2, max_length=5000)
    expected_behaviour: Optional[str] = Field(default=None, max_length=2000)
    validation_criteria: Optional[str] = Field(default=None, max_length=2000)
    change_note: Optional[str] = Field(default=None, max_length=2000)


class RejectIn(BaseModel):
    reason: Optional[str] = None


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


@router.get("/rules")
def list_rules(principal: Principal = Depends(require("view_repository"))):
    """Return flat array — matches frontend Rule[] type."""
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rows = conn.execute(
            """SELECT r.id, r.key, r.label, r.category, r.severity, r.applies_to,
                      rv.version_no, rv.description, rv.expected_behaviour,
                      rv.status as version_status,
                      rv.proposed_by, rv.approved_by, rv.approved_at, rv.id as version_id,
                      r.created_at
               FROM rules r
               LEFT JOIN rule_versions rv ON rv.id = r.current_version_id
               WHERE r.org_id = %s
               ORDER BY r.key""",
            (principal.org_id,),
        ).fetchall()
    return [_serialize(dict(r)) for r in rows]


@router.get("/rules/{rule_id}")
def get_rule(rule_id: str, principal: Principal = Depends(require("view_repository"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rule = conn.execute(
            """SELECT r.id, r.key, r.label, r.category, r.severity, r.applies_to, r.created_at,
                      rv.version_no, rv.description, rv.expected_behaviour,
                      rv.status as version_status, rv.id as version_id
               FROM rules r
               LEFT JOIN rule_versions rv ON rv.id = r.current_version_id
               WHERE r.id = %s AND r.org_id = %s""",
            (rule_id, principal.org_id),
        ).fetchone()
        if not rule:
            raise ApiError(404, "not_found", "Rule not found")
        versions = conn.execute(
            """SELECT id, version_no, description, expected_behaviour, validation_criteria,
                      status, change_note, proposed_by, approved_by, approved_at, created_at
               FROM rule_versions WHERE rule_id = %s ORDER BY version_no ASC""",
            (rule_id,),
        ).fetchall()
    result = _serialize(dict(rule))
    result["versions"] = [_serialize(dict(v)) for v in versions]
    return result


@router.post("/rules", status_code=201)
def create_rule(body: RuleIn, principal: Principal = Depends(require("propose_version"))):
    rule_id, version_id = uuid.uuid4(), uuid.uuid4()
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        existing = conn.execute(
            "SELECT 1 FROM rules WHERE org_id=%s AND key=%s", (principal.org_id, body.key)
        ).fetchone()
        if existing:
            raise ApiError(409, "conflict", f"Rule key '{body.key}' already exists")
        conn.execute(
            "INSERT INTO rules (id, org_id, key, label, category, severity, applies_to, created_by) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (rule_id, principal.org_id, body.key, body.label, body.category,
             body.severity, Jsonb(body.applies_to), principal.user_id),
        )
        conn.execute(
            """INSERT INTO rule_versions
               (id, org_id, rule_id, version_no, description, expected_behaviour,
                validation_criteria, status, change_note, proposed_by)
               VALUES (%s,%s,%s,1,%s,%s,%s,'pending_approval',%s,%s)""",
            (version_id, principal.org_id, rule_id, body.description,
             body.expected_behaviour, body.validation_criteria,
             body.change_note, principal.user_id),
        )
        write_audit(conn, principal.user_id, "rule.created", "rule", rule_id,
                    after={"key": body.key, "version_id": str(version_id), "status": "pending_approval"})
    return {"rule_id": str(rule_id), "version_id": str(version_id), "status": "pending_approval"}


@router.post("/rules/{rule_id}/versions", status_code=201)
def propose_rule_version(rule_id: str, body: RuleVersionIn,
                          principal: Principal = Depends(require("propose_version"))):
    version_id = uuid.uuid4()
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rule = conn.execute(
            "SELECT id FROM rules WHERE id=%s AND org_id=%s FOR UPDATE",
            (rule_id, principal.org_id),
        ).fetchone()
        if not rule:
            raise ApiError(404, "not_found", "Rule not found")
        max_v = conn.execute(
            "SELECT COALESCE(MAX(version_no),0) AS max_version FROM rule_versions WHERE rule_id=%s",
            (rule_id,),
        ).fetchone()["max_version"]
        conn.execute(
            """INSERT INTO rule_versions
               (id, org_id, rule_id, version_no, description, expected_behaviour,
                validation_criteria, status, change_note, proposed_by)
               VALUES (%s,%s,%s,%s,%s,%s,%s,'pending_approval',%s,%s)""",
            (version_id, principal.org_id, rule_id, max_v + 1, body.description,
             body.expected_behaviour, body.validation_criteria,
             body.change_note, principal.user_id),
        )
        write_audit(conn, principal.user_id, "rule_version.proposed", "rule_version", version_id)
    return {"version_id": str(version_id), "version_no": max_v + 1}


@router.post("/rules/{rule_id}/versions/{version_no}/approve")
def approve_rule_version(rule_id: str, version_no: int,
                          principal: Principal = Depends(require("approve_version"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        conn.execute("SELECT id FROM rules WHERE id=%s AND org_id=%s FOR UPDATE", (rule_id, principal.org_id))
        ver = conn.execute(
            "SELECT id, status, proposed_by FROM rule_versions WHERE rule_id=%s AND version_no=%s AND org_id=%s",
            (rule_id, version_no, principal.org_id),
        ).fetchone()
        if not ver:
            raise ApiError(404, "not_found", "Version not found")
        if str(ver["proposed_by"]) == str(principal.user_id):
            raise ApiError(409, "conflict", "Separation of duties: cannot approve your own proposal")
        if ver["status"] not in ("draft", "pending_approval"):
            raise ApiError(409, "conflict", f"Cannot approve a version in status '{ver['status']}'")
        conn.execute(
            "UPDATE rule_versions SET status='approved', approved_by=%s, approved_at=now() WHERE id=%s",
            (principal.user_id, ver["id"]),
        )
        old = conn.execute("SELECT current_version_id FROM rules WHERE id=%s", (rule_id,)).fetchone()
        if old and old["current_version_id"] and str(old["current_version_id"]) != str(ver["id"]):
            conn.execute(
                "UPDATE rule_versions SET status='superseded' WHERE id=%s AND status='approved'",
                (old["current_version_id"],),
            )
        conn.execute("UPDATE rules SET current_version_id=%s WHERE id=%s", (ver["id"], rule_id))
        write_audit(conn, principal.user_id, "rule_version.approved", "rule_version", ver["id"])
    return {"status": "approved"}


@router.post("/rules/{rule_id}/versions/{version_no}/reject")
def reject_rule_version(rule_id: str, version_no: int, body: RejectIn = RejectIn(),
                         principal: Principal = Depends(require("approve_version"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        conn.execute("SELECT id FROM rules WHERE id=%s AND org_id=%s FOR UPDATE", (rule_id, principal.org_id))
        ver = conn.execute(
            "SELECT id, status FROM rule_versions WHERE rule_id=%s AND version_no=%s AND org_id=%s",
            (rule_id, version_no, principal.org_id),
        ).fetchone()
        if not ver:
            raise ApiError(404, "not_found", "Version not found")
        if ver["status"] not in ("draft", "pending_approval"):
            raise ApiError(409, "conflict", f"Cannot reject a version in status '{ver['status']}'")
        conn.execute("UPDATE rule_versions SET status='rejected' WHERE id=%s", (ver["id"],))
        write_audit(conn, principal.user_id, "rule_version.rejected", "rule_version", ver["id"])
    return {"status": "rejected"}
