"""T05 – Facts API: versions, approval, diff, separation of duties."""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from psycopg.types.json import Jsonb
from pydantic import BaseModel

from ..core.audit import write_audit
from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, get_principal, require

router = APIRouter(prefix="/v1")


# ─── Pydantic models ──────────────────────────────────────────────────────────

class FactCreate(BaseModel):
    key: str
    label: str
    category: str
    value_text: str
    value_number: Optional[float] = None
    value_unit: Optional[str] = None
    qualifier: str = "exact"
    source_ref: Optional[str] = None
    valid_from: str
    expires_at: Optional[str] = None
    change_note: Optional[str] = None


class FactPatch(BaseModel):
    label: Optional[str] = None
    category: Optional[str] = None


class VersionPropose(BaseModel):
    value_text: str
    value_number: Optional[float] = None
    value_unit: Optional[str] = None
    qualifier: str = "exact"
    source_ref: Optional[str] = None
    valid_from: str
    expires_at: Optional[str] = None
    change_note: Optional[str] = None


class VersionEdit(BaseModel):
    value_text: Optional[str] = None
    value_number: Optional[float] = None
    value_unit: Optional[str] = None
    qualifier: Optional[str] = None
    source_ref: Optional[str] = None
    valid_from: Optional[str] = None
    expires_at: Optional[str] = None
    change_note: Optional[str] = None


class RejectBody(BaseModel):
    reason: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _fact_row(conn, org_id, fact_id):
    row = conn.execute(
        """SELECT f.*, fv.version_no, fv.value_text, fv.value_number, fv.value_unit,
                  fv.qualifier, fv.source_ref, fv.valid_from, fv.expires_at,
                  fv.status as version_status, fv.proposed_by, fv.approved_by,
                  fv.approved_at, fv.change_note
           FROM facts f
           LEFT JOIN fact_versions fv ON fv.id = f.current_version_id
           WHERE f.id = %s AND f.org_id = %s""",
        (fact_id, org_id),
    ).fetchone()
    if not row:
        raise ApiError(404, "not_found", "Fact not found")
    return dict(row)


def _serialize(row: dict) -> dict:
    """Convert UUID and date objects to strings for JSON serialisation."""
    out = {}
    for k, v in row.items():
        if hasattr(v, "hex"):  # uuid
            out[k] = str(v)
        elif hasattr(v, "isoformat"):  # date / datetime
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/facts")
def list_facts(principal: Principal = Depends(require("view_repository"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rows = conn.execute(
            """SELECT f.id, f.key, f.label, f.category, f.created_at,
                      fv.version_no, fv.value_text, fv.value_number, fv.value_unit,
                      fv.qualifier, fv.status as version_status, fv.expires_at
               FROM facts f
               LEFT JOIN fact_versions fv ON fv.id = f.current_version_id
               WHERE f.org_id = %s
               ORDER BY f.key""",
            (principal.org_id,),
        ).fetchall()
    return [_serialize(dict(r)) for r in rows]


@router.post("/facts", status_code=201)
def create_fact(body: FactCreate, principal: Principal = Depends(require("propose_version"))):
    fact_id = uuid.uuid4()
    version_id = uuid.uuid4()
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        # Check key uniqueness
        if conn.execute("SELECT 1 FROM facts WHERE org_id=%s AND key=%s", (principal.org_id, body.key)).fetchone():
            raise ApiError(409, "conflict", f"Fact key '{body.key}' already exists")
        conn.execute(
            """INSERT INTO facts (id, org_id, key, label, category, created_by)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (fact_id, principal.org_id, body.key, body.label, body.category, principal.user_id),
        )
        conn.execute(
            """INSERT INTO fact_versions
               (id, org_id, fact_id, version_no, value_text, value_number, value_unit,
                qualifier, source_ref, valid_from, expires_at, status, change_note, proposed_by)
               VALUES (%s,%s,%s,1,%s,%s,%s,%s,%s,%s,%s,'draft',%s,%s)""",
            (version_id, principal.org_id, fact_id, body.value_text, body.value_number,
             body.value_unit, body.qualifier, body.source_ref, body.valid_from,
             body.expires_at, body.change_note, principal.user_id),
        )
        write_audit(conn, principal.user_id, "fact.created", "fact", fact_id, after={"key": body.key})
    return {"fact_id": str(fact_id), "version_id": str(version_id)}


@router.get("/facts/{fact_id}")
def get_fact(fact_id: uuid.UUID, principal: Principal = Depends(require("view_repository"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        fact = _fact_row(conn, principal.org_id, fact_id)
        versions = conn.execute(
            """SELECT id, version_no, value_text, value_number, value_unit, qualifier,
                      source_ref, valid_from, expires_at, status, change_note,
                      proposed_by, approved_by, approved_at, created_at
               FROM fact_versions WHERE fact_id = %s ORDER BY version_no""",
            (fact_id,),
        ).fetchall()
        aliases = conn.execute(
            "SELECT alias_text, kind FROM fact_aliases WHERE fact_id=%s", (fact_id,)
        ).fetchall()
    return {
        **_serialize(fact),
        "versions": [_serialize(dict(v)) for v in versions],
        "aliases": [dict(a) for a in aliases],
    }


@router.patch("/facts/{fact_id}")
def patch_fact(fact_id: uuid.UUID, body: FactPatch, principal: Principal = Depends(require("propose_version"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise ApiError(400, "bad_request", "No fields to update")
    set_clause = ", ".join(f"{k}=%s" for k in updates)
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        result = conn.execute(
            f"UPDATE facts SET {set_clause} WHERE id=%s AND org_id=%s",
            [*updates.values(), fact_id, principal.org_id],
        )
        if result.rowcount == 0:
            raise ApiError(404, "not_found", "Fact not found")
        write_audit(conn, principal.user_id, "fact.patched", "fact", fact_id, after=updates)
    return {"updated": True}


@router.post("/facts/{fact_id}/versions", status_code=201)
def propose_version(fact_id: uuid.UUID, body: VersionPropose, principal: Principal = Depends(require("propose_version"))):
    version_id = uuid.uuid4()
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        if not conn.execute("SELECT 1 FROM facts WHERE id=%s AND org_id=%s", (fact_id, principal.org_id)).fetchone():
            raise ApiError(404, "not_found", "Fact not found")
        row = conn.execute(
            "SELECT COALESCE(MAX(version_no),0) as max_v FROM fact_versions WHERE fact_id=%s", (fact_id,)
        ).fetchone()
        next_v = row["max_v"] + 1
        conn.execute(
            """INSERT INTO fact_versions
               (id, org_id, fact_id, version_no, value_text, value_number, value_unit,
                qualifier, source_ref, valid_from, expires_at, status, change_note, proposed_by)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'draft',%s,%s)""",
            (version_id, principal.org_id, fact_id, next_v, body.value_text, body.value_number,
             body.value_unit, body.qualifier, body.source_ref, body.valid_from,
             body.expires_at, body.change_note, principal.user_id),
        )
        write_audit(conn, principal.user_id, "fact_version.proposed", "fact_version", version_id,
                    after={"fact_id": str(fact_id), "version_no": next_v})
    return {"version_id": str(version_id), "version_no": next_v}


@router.patch("/facts/{fact_id}/versions/{version_no}")
def edit_version(fact_id: uuid.UUID, version_no: int, body: VersionEdit,
                 principal: Principal = Depends(require("propose_version"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        ver = conn.execute(
            "SELECT id, status, proposed_by FROM fact_versions WHERE fact_id=%s AND version_no=%s",
            (fact_id, version_no),
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
        conn.execute(
            f"UPDATE fact_versions SET {set_clause} WHERE id=%s",
            [*updates.values(), ver["id"]],
        )
        write_audit(conn, principal.user_id, "fact_version.edited", "fact_version", ver["id"], after=updates)
    return {"updated": True}


@router.post("/facts/{fact_id}/versions/{version_no}/submit")
def submit_version(fact_id: uuid.UUID, version_no: int, principal: Principal = Depends(require("propose_version"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        ver = conn.execute(
            "SELECT id, status, proposed_by FROM fact_versions WHERE fact_id=%s AND version_no=%s",
            (fact_id, version_no),
        ).fetchone()
        if not ver:
            raise ApiError(404, "not_found", "Version not found")
        if ver["status"] != "draft":
            raise ApiError(409, "wrong_status", f"Version is '{ver['status']}', expected 'draft'")
        conn.execute("UPDATE fact_versions SET status='pending_approval' WHERE id=%s", (ver["id"],))
        write_audit(conn, principal.user_id, "fact_version.submitted", "fact_version", ver["id"])
    return {"status": "pending_approval"}


@router.post("/facts/{fact_id}/versions/{version_no}/approve")
def approve_version(fact_id: uuid.UUID, version_no: int, principal: Principal = Depends(require("approve_version"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        ver = conn.execute(
            "SELECT id, status, proposed_by FROM fact_versions WHERE fact_id=%s AND version_no=%s",
            (fact_id, version_no),
        ).fetchone()
        if not ver:
            raise ApiError(404, "not_found", "Version not found")
        if ver["status"] != "pending_approval":
            raise ApiError(409, "wrong_status", f"Version is '{ver['status']}', expected 'pending_approval'")
        # Separation of duties
        if str(ver["proposed_by"]) == principal.user_id:
            raise ApiError(403, "separation_of_duties", "Approver must be different from proposer")

        # Supersede previous approved version
        conn.execute(
            """UPDATE fact_versions SET status='superseded'
               WHERE fact_id=%s AND status='approved'""",
            (fact_id,),
        )
        # Approve this version
        conn.execute(
            """UPDATE fact_versions
               SET status='approved', approved_by=%s, approved_at=now()
               WHERE id=%s""",
            (principal.user_id, ver["id"]),
        )
        # Update the fact's current_version_id
        conn.execute(
            "UPDATE facts SET current_version_id=%s WHERE id=%s", (ver["id"], fact_id)
        )
        write_audit(conn, principal.user_id, "fact_version.approved", "fact_version", ver["id"])
    return {"status": "approved"}


@router.post("/facts/{fact_id}/versions/{version_no}/reject")
def reject_version(fact_id: uuid.UUID, version_no: int, body: RejectBody = RejectBody(),
                   principal: Principal = Depends(require("approve_version"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        ver = conn.execute(
            "SELECT id, status FROM fact_versions WHERE fact_id=%s AND version_no=%s",
            (fact_id, version_no),
        ).fetchone()
        if not ver:
            raise ApiError(404, "not_found", "Version not found")
        if ver["status"] not in ("draft", "pending_approval"):
            raise ApiError(409, "wrong_status", "Only draft or pending_approval versions can be rejected")
        conn.execute("UPDATE fact_versions SET status='rejected' WHERE id=%s", (ver["id"],))
        write_audit(conn, principal.user_id, "fact_version.rejected", "fact_version", ver["id"],
                    after={"reason": body.reason})
    return {"status": "rejected"}


@router.get("/facts/{fact_id}/versions/{version_no}/diff")
def diff_version(fact_id: uuid.UUID, version_no: int, principal: Principal = Depends(require("view_repository"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        current = conn.execute(
            """SELECT value_text, value_number, value_unit, qualifier, source_ref,
                      valid_from, expires_at, change_note, status
               FROM fact_versions WHERE fact_id=%s AND version_no=%s""",
            (fact_id, version_no),
        ).fetchone()
        if not current:
            raise ApiError(404, "not_found", "Version not found")
        if version_no > 1:
            previous = conn.execute(
                """SELECT value_text, value_number, value_unit, qualifier, source_ref,
                          valid_from, expires_at, change_note, status
                   FROM fact_versions WHERE fact_id=%s AND version_no=%s""",
                (fact_id, version_no - 1),
            ).fetchone()
        else:
            previous = None

    FIELDS = ["value_text", "value_number", "value_unit", "qualifier", "source_ref",
              "valid_from", "expires_at", "change_note", "status"]

    def _v(row, f):
        v = row[f] if row else None
        return v.isoformat() if hasattr(v, "isoformat") else v

    diff = {}
    for f in FIELDS:
        before = _v(previous, f) if previous else None
        after = _v(current, f)
        if before != after:
            diff[f] = {"before": before, "after": after}

    return {"version_no": version_no, "diff": diff}
