"""T05 – Rules CRUD with versions and approval, mirrors facts API."""
import uuid
from typing import Optional

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
    category: str
    severity: str
    applies_to: list[str] = ["all"]
    description: str = Field(min_length=2)
    expected_behaviour: Optional[str] = None
    validation_criteria: Optional[str] = None
    change_note: Optional[str] = None


class RuleVersionIn(BaseModel):
    description: str = Field(min_length=2)
    expected_behaviour: Optional[str] = None
    validation_criteria: Optional[str] = None
    change_note: Optional[str] = None


class ApprovalIn(BaseModel):
    action: str  # "approve" | "reject"
    note: Optional[str] = None


@router.get("/rules")
def list_rules(principal: Principal = Depends(require("view_repository"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rows = conn.execute(
            """SELECT r.id, r.key, r.label, r.category, r.severity, r.applies_to,
                      rv.version_no, rv.description, rv.expected_behaviour, rv.status,
                      rv.proposed_by, rv.approved_by, rv.approved_at, rv.id as version_id
               FROM rules r
               LEFT JOIN rule_versions rv ON rv.id = r.current_version_id
               ORDER BY r.key""",
        ).fetchall()
    return {"rules": [dict(r) for r in rows]}


@router.get("/rules/{rule_id}")
def get_rule(rule_id: str, principal: Principal = Depends(require("view_repository"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rule = conn.execute("SELECT * FROM rules WHERE id = %s", (rule_id,)).fetchone()
        if not rule:
            raise ApiError(404, "not_found", "Rule not found")
        versions = conn.execute(
            "SELECT * FROM rule_versions WHERE rule_id = %s ORDER BY version_no DESC", (rule_id,)
        ).fetchall()
        examples = conn.execute(
            """SELECT re.* FROM rule_examples re
               JOIN rule_versions rv ON rv.id = re.rule_version_id
               WHERE rv.rule_id = %s ORDER BY re.created_at""", (rule_id,)
        ).fetchall()
    return {
        "rule": dict(rule),
        "versions": [dict(v) for v in versions],
        "examples": [dict(e) for e in examples],
    }


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
            (rule_id, principal.org_id, body.key, body.label, body.category, body.severity, Jsonb(body.applies_to), principal.user_id),
        )
        conn.execute(
            """INSERT INTO rule_versions (id, org_id, rule_id, version_no, description, expected_behaviour,
                   validation_criteria, status, change_note, proposed_by)
               VALUES (%s,%s,%s,1,%s,%s,%s,'draft',%s,%s)""",
            (version_id, principal.org_id, rule_id, body.description, body.expected_behaviour,
             body.validation_criteria, body.change_note, principal.user_id),
        )
        conn.execute("UPDATE rules SET current_version_id=%s WHERE id=%s", (version_id, rule_id))
        write_audit(conn, principal.user_id, "rule.created", "rule", rule_id, after={"key": body.key})
    return {"rule_id": str(rule_id), "version_id": str(version_id)}


@router.post("/rules/{rule_id}/versions", status_code=201)
def propose_rule_version(rule_id: str, body: RuleVersionIn, principal: Principal = Depends(require("propose_version"))):
    version_id = uuid.uuid4()
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rule = conn.execute("SELECT id FROM rules WHERE id=%s", (rule_id,)).fetchone()
        if not rule:
            raise ApiError(404, "not_found", "Rule not found")
        max_v = conn.execute(
            "SELECT COALESCE(MAX(version_no),0) FROM rule_versions WHERE rule_id=%s", (rule_id,)
        ).fetchone()[0]
        conn.execute(
            """INSERT INTO rule_versions (id, org_id, rule_id, version_no, description, expected_behaviour,
                   validation_criteria, status, change_note, proposed_by)
               VALUES (%s,%s,%s,%s,%s,%s,%s,'pending_approval',%s,%s)""",
            (version_id, principal.org_id, rule_id, max_v + 1, body.description, body.expected_behaviour,
             body.validation_criteria, body.change_note, principal.user_id),
        )
        write_audit(conn, principal.user_id, "rule_version.proposed", "rule_version", version_id)
    return {"version_id": str(version_id)}


@router.post("/rules/{rule_id}/versions/{version_id}/approve")
def approve_rule_version(rule_id: str, version_id: str, body: ApprovalIn,
                          principal: Principal = Depends(require("approve_version"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        ver = conn.execute(
            "SELECT * FROM rule_versions WHERE id=%s AND rule_id=%s", (version_id, rule_id)
        ).fetchone()
        if not ver:
            raise ApiError(404, "not_found", "Version not found")
        if str(ver["proposed_by"]) == str(principal.user_id):
            raise ApiError(409, "conflict", "Separation of duties: cannot approve own proposal")
        if ver["status"] not in ("draft", "pending_approval"):
            raise ApiError(409, "conflict", f"Cannot approve a version in status '{ver['status']}'")
        if body.action == "approve":
            conn.execute(
                "UPDATE rule_versions SET status='approved', approved_by=%s, approved_at=now() WHERE id=%s",
                (principal.user_id, version_id),
            )
            old = conn.execute("SELECT current_version_id FROM rules WHERE id=%s", (rule_id,)).fetchone()
            if old and old["current_version_id"] and str(old["current_version_id"]) != version_id:
                conn.execute(
                    "UPDATE rule_versions SET status='superseded' WHERE id=%s AND status='approved'",
                    (old["current_version_id"],),
                )
            conn.execute("UPDATE rules SET current_version_id=%s WHERE id=%s", (version_id, rule_id))
            write_audit(conn, principal.user_id, "rule_version.approved", "rule_version", version_id)
        else:
            conn.execute("UPDATE rule_versions SET status='rejected' WHERE id=%s", (version_id,))
            write_audit(conn, principal.user_id, "rule_version.rejected", "rule_version", version_id)
    return {"status": "approved" if body.action == "approve" else "rejected"}
