"""T08 – Content submission and text extraction (text, DOCX, PDF) with immutable versions."""
import hashlib
import io
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel

from ..core.audit import write_audit
from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, require
from ..services.extraction import extract_text

router = APIRouter(prefix="/v1")

VALID_CHANNELS = ("web", "social", "email", "press", "pdf", "image")


class ContentItemIn(BaseModel):
    title: str
    channel: str
    body_text: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────────────
# Listing and retrieval
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/content")
def list_content(principal: Principal = Depends(require("submit_content"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rows = conn.execute(
            """SELECT ci.id, ci.title, ci.channel, ci.status, ci.registered_state,
                      ci.scheduled_for, ci.published_url, ci.created_at,
                      cv.version_no, cv.body_text, cv.content_hash, cv.id as version_id
               FROM content_items ci
               LEFT JOIN content_versions cv ON cv.id = ci.current_version_id
               ORDER BY ci.created_at DESC""",
        ).fetchall()
    return {"content": [dict(r) for r in rows]}


@router.get("/content/{item_id}")
def get_content(item_id: str, principal: Principal = Depends(require("submit_content"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        item = conn.execute("SELECT * FROM content_items WHERE id=%s", (item_id,)).fetchone()
        if not item:
            raise ApiError(404, "not_found", "Content item not found")
        versions = conn.execute(
            "SELECT * FROM content_versions WHERE content_item_id=%s ORDER BY version_no DESC", (item_id,)
        ).fetchall()
        findings = conn.execute(
            """SELECT f.* FROM findings f
               JOIN content_versions cv ON cv.id = f.content_version_id
               WHERE cv.content_item_id=%s
               ORDER BY f.severity DESC, f.created_at""",
            (item_id,),
        ).fetchall()
    return {
        "item": dict(item),
        "versions": [dict(v) for v in versions],
        "findings": [dict(f) for f in findings],
    }


# ──────────────────────────────────────────────────────────────────────────────
# Submission: plain text
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/content", status_code=201)
def submit_content_text(body: ContentItemIn, principal: Principal = Depends(require("submit_content"))):
    """Create a new content item from plain text and immediately queue analysis."""
    if body.channel not in VALID_CHANNELS:
        raise ApiError(422, "validation_failed", f"channel must be one of {VALID_CHANNELS}")
    text = (body.body_text or "").strip()
    if not text:
        raise ApiError(422, "validation_failed", "body_text is required for text submissions")
    return _create_item(principal, body.title, body.channel, text)


# ──────────────────────────────────────────────────────────────────────────────
# Submission: file upload (DOCX / PDF / plain text)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/content/upload", status_code=201)
async def submit_content_file(
    title: str = Form(...),
    channel: str = Form(...),
    file: UploadFile = File(...),
    principal: Principal = Depends(require("submit_content")),
):
    if channel not in VALID_CHANNELS:
        raise ApiError(422, "validation_failed", f"channel must be one of {VALID_CHANNELS}")
    raw = await file.read()
    filename = file.filename or ""
    text = extract_text(raw, filename)
    if not text.strip():
        raise ApiError(422, "validation_failed", "Could not extract text from uploaded file")
    return _create_item(principal, title, channel, text, source_file=filename)


# ──────────────────────────────────────────────────────────────────────────────
# New version of existing item
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/content/{item_id}/versions", status_code=201)
def submit_new_version(item_id: str, body: ContentItemIn, principal: Principal = Depends(require("submit_content"))):
    text = (body.body_text or "").strip()
    if not text:
        raise ApiError(422, "validation_failed", "body_text is required")
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        item = conn.execute("SELECT * FROM content_items WHERE id=%s", (item_id,)).fetchone()
        if not item:
            raise ApiError(404, "not_found", "Content item not found")
        max_v = conn.execute(
            "SELECT COALESCE(MAX(version_no),0) FROM content_versions WHERE content_item_id=%s", (item_id,)
        ).fetchone()[0]
        version_id = uuid.uuid4()
        content_hash = hashlib.sha256(text.encode()).hexdigest()
        conn.execute(
            "INSERT INTO content_versions (id, org_id, content_item_id, version_no, body_text, content_hash, created_by) VALUES (%s,%s,%s,%s,%s,%s,%s)",
            (version_id, principal.org_id, item_id, max_v + 1, text, content_hash, principal.user_id),
        )
        conn.execute(
            "UPDATE content_items SET current_version_id=%s, status='draft' WHERE id=%s",
            (version_id, item_id),
        )
        write_audit(conn, principal.user_id, "content.version_added", "content_version", version_id,
                    after={"item_id": item_id, "version_no": max_v + 1})
    return {"item_id": item_id, "version_id": str(version_id), "version_no": max_v + 1}


# ──────────────────────────────────────────────────────────────────────────────
# Internal helper
# ──────────────────────────────────────────────────────────────────────────────

def _create_item(principal: Principal, title: str, channel: str, text: str, source_file: str = None) -> dict:
    item_id = uuid.uuid4()
    version_id = uuid.uuid4()
    content_hash = hashlib.sha256(text.encode()).hexdigest()
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        conn.execute(
            "INSERT INTO content_items (id, org_id, title, channel, status, created_by) VALUES (%s,%s,%s,%s,'draft',%s)",
            (item_id, principal.org_id, title, channel, principal.user_id),
        )
        conn.execute(
            "INSERT INTO content_versions (id, org_id, content_item_id, version_no, body_text, source_file_key, content_hash, created_by) VALUES (%s,%s,%s,1,%s,%s,%s,%s)",
            (version_id, principal.org_id, item_id, text, source_file, content_hash, principal.user_id),
        )
        conn.execute("UPDATE content_items SET current_version_id=%s WHERE id=%s", (version_id, item_id))
        write_audit(conn, principal.user_id, "content.submitted", "content_item", item_id,
                    after={"title": title, "channel": channel})
    return {"item_id": str(item_id), "version_id": str(version_id)}
