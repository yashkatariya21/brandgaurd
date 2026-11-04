"""T05 – Facts and rules CRUD with versioning, approval workflow, and separation of duties."""
import hashlib
import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..core.audit import write_audit
from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, require

router = APIRouter(prefix="/v1")

# ──────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ──────────────────────────────────────────────────────────────────────────────

class FactIn(BaseModel):
    key: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9_]+$")
    label: str = Field(min_length=2, max_length=200)
    category: str
    value_text: str = Field(min_length=1, max_length=2000)
    value_number: Optional[float] = None
    value_unit: Optional[str] = None
    qualifier: str = "exact"
    source_ref: Optional[str] = None
    valid_from: str  # ISO date
    expires_at: Optional[str] = None
    change_note: Optional[str] = None


class FactVersionIn(BaseModel):
    value_text: str = Field(min_length=1, max_length=2000)
    value_number: Optional[float] = None
    value_unit: Optional[str] = None
    qualifier: str = "exact"
    source_ref: Optional[str] = None
    valid_from: str
    expires_at: Optional[str] = None
    change_note: Optional[str] = None


class ApprovalIn(BaseModel):
    action: str  # "approve" | "reject"
    note: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────────
# Facts
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/facts")
def list_facts(principal: Principal = Depends(require("view_repository"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rows = conn.execute(
            """SELECT f.id, f.key, f.label, f.category, f.created_at,
                      fv.version_no, fv.value_text, fv.value_number, fv.value_unit,
                      fv.qualifier, fv.source_ref, fv.valid_from, fv.expires_at,
                      fv.status, fv.proposed_by, fv.approved_by, fv.approved_at, fv.id as version_id
               FROM facts f
               LEFT JOIN fact_versions fv ON fv.id = f.current_version_id
               ORDER BY f.key""",
        ).fetchall()
    return {"facts": [dict(r) for r in rows]}


@router.get("/facts/{fact_id}")
def get_fact(fact_id: str, principal: Principal = Depends(require("view_repository"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        fact = conn.execute("SELECT * FROM facts WHERE id = %s", (fact_id,)).fetchone()
        if not fact:
            raise ApiError(404, "not_found", "Fact not found")
        versions = conn.execute(
            "SELECT * FROM fact_versions WHERE fact_id = %s ORDER BY version_no DESC", (fact_id,)
        ).fetchall()
        aliases = conn.execute(
            "SELECT alias_text, kind FROM fact_aliases WHERE fact_id = %s", (fact_id,)
        ).fetchall()
    return {"fact": dict(fact), "versions": [dict(v) for v in versions], "aliases": [dict(a) for a in aliases]}


@router.post("/facts", status_code=201)
def create_fact(body: FactIn, principal: Principal = Depends(require("propose_version"))):
    fact_id, version_id = uuid.uuid4(), uuid.uuid4()
    content_hash = hashlib.sha256(body.value_text.encode()).hexdigest()
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        existing = conn.execute(
            "SELECT 1 FROM facts WHERE org_id = %s AND key = %s", (principal.org_id, body.key)
        ).fetchone()
        if existing:
            raise ApiError(409, "conflict", f"Fact key '{body.key}' already exists")
        conn.execute(
            "INSERT INTO facts (id, org_id, key, label, category, owner_user_id, created_by) VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (fact_id, principal.org_id, body.key, body.label, body.category, principal.user_id, principal.user_id),
        )
        conn.execute(
            """INSERT INTO fact_versions (id, org_id, fact_id, version_no, value_text, value_number, value_unit,
                   qualifier, source_ref, valid_from, expires_at, status, change_note, proposed_by, content_hash)
               VALUES (%s,%s,%s,1,%s,%s,%s,%s,%s,%s,%s,'draft',%s,%s,%s)""",
            (version_id, principal.org_id, fact_id, body.value_text, body.value_number, body.value_unit,
             body.qualifier, body.source_ref, body.valid_from, body.expires_at, body.change_note,
             principal.user_id, content_hash),
        )
        conn.execute("UPDATE facts SET current_version_id = %s WHERE id = %s", (version_id, fact_id))
        write_audit(conn, principal.user_id, "fact.created", "fact", fact_id,
                    after={"key": body.key, "version_id": str(version_id)})
    return {"fact_id": str(fact_id), "version_id": str(version_id)}


@router.post("/facts/{fact_id}/versions", status_code=201)
def propose_fact_version(fact_id: str, body: FactVersionIn, principal: Principal = Depends(require("propose_version"))):
    version_id = uuid.uuid4()
    content_hash = hashlib.sha256(body.value_text.encode()).hexdigest()
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        fact = conn.execute("SELECT id FROM facts WHERE id = %s", (fact_id,)).fetchone()
        if not fact:
            raise ApiError(404, "not_found", "Fact not found")
        max_v = conn.execute(
            "SELECT COALESCE(MAX(version_no),0) FROM fact_versions WHERE fact_id = %s", (fact_id,)
        ).fetchone()[0]
        conn.execute(
            """INSERT INTO fact_versions (id, org_id, fact_id, version_no, value_text, value_number, value_unit,
                   qualifier, source_ref, valid_from, expires_at, status, change_note, proposed_by, content_hash)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'pending_approval',%s,%s,%s)""",
            (version_id, principal.org_id, fact_id, max_v + 1, body.value_text, body.value_number, body.value_unit,
             body.qualifier, body.source_ref, body.valid_from, body.expires_at, body.change_note,
             principal.user_id, content_hash),
        )
        write_audit(conn, principal.user_id, "fact_version.proposed", "fact_version", version_id,
                    after={"fact_id": fact_id, "version_no": max_v + 1})
    return {"version_id": str(version_id)}


@router.post("/facts/{fact_id}/versions/{version_id}/approve")
def approve_fact_version(fact_id: str, version_id: str, body: ApprovalIn,
                          principal: Principal = Depends(require("approve_version"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        ver = conn.execute(
            "SELECT * FROM fact_versions WHERE id = %s AND fact_id = %s", (version_id, fact_id)
        ).fetchone()
        if not ver:
            raise ApiError(404, "not_found", "Version not found")
        if str(ver["proposed_by"]) == str(principal.user_id):
            raise ApiError(409, "conflict", "Separation of duties: cannot approve own proposal")
        if ver["status"] not in ("draft", "pending_approval"):
            raise ApiError(409, "conflict", f"Cannot approve a version in status '{ver['status']}'")
        if body.action == "approve":
            conn.execute(
                "UPDATE fact_versions SET status='approved', approved_by=%s, approved_at=now() WHERE id=%s",
                (principal.user_id, version_id),
            )
            # Supersede old current version
            old_current = conn.execute(
                "SELECT current_version_id FROM facts WHERE id=%s", (fact_id,)
            ).fetchone()
            if old_current and old_current["current_version_id"] and str(old_current["current_version_id"]) != version_id:
                conn.execute(
                    "UPDATE fact_versions SET status='superseded' WHERE id=%s AND status='approved'",
                    (old_current["current_version_id"],),
                )
            conn.execute("UPDATE facts SET current_version_id=%s WHERE id=%s", (version_id, fact_id))
            write_audit(conn, principal.user_id, "fact_version.approved", "fact_version", version_id)
        else:
            conn.execute("UPDATE fact_versions SET status='rejected' WHERE id=%s", (version_id,))
            write_audit(conn, principal.user_id, "fact_version.rejected", "fact_version", version_id)
    return {"status": "approved" if body.action == "approve" else "rejected"}


@router.get("/facts/{fact_id}/diff/{v1}/{v2}")
def diff_fact_versions(fact_id: str, v1: int, v2: int, principal: Principal = Depends(require("view_repository"))):
    """Return two versions side by side for diffing in the UI."""
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rows = conn.execute(
            "SELECT * FROM fact_versions WHERE fact_id=%s AND version_no IN (%s,%s) ORDER BY version_no",
            (fact_id, v1, v2),
        ).fetchall()
    if len(rows) < 2:
        raise ApiError(404, "not_found", "One or both versions not found")
    return {"before": dict(rows[0]), "after": dict(rows[1])}
