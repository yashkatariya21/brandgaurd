"""T08 – Content submission, text extraction, and analysis trigger."""
import hashlib
import logging
import re
import uuid
from typing import Literal, Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel, Field

from ..core.audit import write_audit
from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, require
from ..services.extraction import ExtractionError, extract_text

router = APIRouter(prefix="/v1")
logger = logging.getLogger(__name__)

VALID_CHANNELS = ("web", "social", "email", "press", "pdf", "image")
MAX_UPLOAD_BYTES = 10_000_000
MAX_CONTENT_TEXT = 1_000_000


class ContentItemIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    channel: Literal["web", "social", "email", "press", "pdf", "image"]
    body_text: Optional[str] = Field(default=None, max_length=MAX_CONTENT_TEXT)


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


# ──────────────────────────────────────────────────────────────────────────────
# List content — returns a plain array (matches frontend ContentItem[])
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/content")
def list_content(principal: Principal = Depends(require("submit_content"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rows = conn.execute(
            """SELECT ci.id, ci.title, ci.channel, ci.status, ci.registered_state,
                      ci.scheduled_for, ci.published_url, ci.created_at,
                      cv.version_no, cv.content_hash, cv.id as version_id
               FROM content_items ci
               LEFT JOIN content_versions cv ON cv.id = ci.current_version_id
               WHERE ci.org_id = %s
               ORDER BY ci.created_at DESC""",
            (principal.org_id,),
        ).fetchall()
    return [_serialize(dict(r)) for r in rows]


# ──────────────────────────────────────────────────────────────────────────────
# Get single content item — flat object with body_text, claims, findings
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/content/{item_id}")
def get_content(item_id: str, principal: Principal = Depends(require("submit_content"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        item = conn.execute(
            """SELECT ci.id, ci.title, ci.channel, ci.status, ci.registered_state,
                      ci.scheduled_for, ci.published_url, ci.created_at,
                      cv.version_no, cv.body_text, cv.content_hash, cv.id as current_version_id
               FROM content_items ci
               LEFT JOIN content_versions cv ON cv.id = ci.current_version_id
               WHERE ci.id=%s AND ci.org_id=%s""",
            (item_id, principal.org_id),
        ).fetchone()
        if not item:
            raise ApiError(404, "not_found", "Content item not found")

        claims = conn.execute(
            """SELECT id, span_start, span_end, raw_text, entity, value_number, value_unit,
                      link_status, fact_id
               FROM content_claims
               WHERE content_version_id=%s
               ORDER BY span_start""",
            (item["current_version_id"],),
        ).fetchall() if item["current_version_id"] else []

        findings = conn.execute(
            """SELECT f.id, f.issue, f.severity, f.finding_type, f.source_kind,
                      f.status, f.created_at, f.span_start, f.span_end
               FROM findings f
               JOIN content_versions cv ON cv.id = f.content_version_id
               WHERE cv.content_item_id=%s
               ORDER BY
                 CASE f.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
                 f.created_at""",
            (item_id,),
        ).fetchall()

    result = _serialize(dict(item))
    result["claims"] = [_serialize(dict(c)) for c in claims]
    result["findings"] = [_serialize(dict(f)) for f in findings]
    return result


# ──────────────────────────────────────────────────────────────────────────────
# Submission: plain text
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/content", status_code=201)
def submit_content_text(body: ContentItemIn,
                         principal: Principal = Depends(require("submit_content"))):
    text = (body.body_text or "").strip()
    if not text:
        raise ApiError(422, "validation_failed", "body_text is required for text submissions")
    result = _create_item(principal, body.title, body.channel, text)
    return {"content_item_id": result["item_id"], "version_id": result["version_id"]}


# ──────────────────────────────────────────────────────────────────────────────
# Submission: file upload
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/content/upload", status_code=201)
async def submit_content_file(
    title: str = Form(..., min_length=1, max_length=200),
    channel: str = Form(..., pattern="^(web|social|email|press|pdf|image)$"),
    file: UploadFile = File(...),
    principal: Principal = Depends(require("submit_content")),
):
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ApiError(413, "upload_too_large", "Uploads must be 10 MB or smaller")
    if not raw:
        raise ApiError(422, "validation_failed", "Uploaded file is empty")
    filename = file.filename or ""
    try:
        text = extract_text(raw, filename)
    except ExtractionError as exc:
        raise ApiError(422, "validation_failed", str(exc)) from exc
    if not text.strip():
        raise ApiError(422, "validation_failed", "Could not extract text from uploaded file")
    # Keep only a plain basename as descriptive metadata; never treat a client filename
    # as a storage path or key.
    safe_filename = re.split(r"[\\/]", filename)[-1].replace("\x00", "")[:255]
    result = _create_item(principal, title, channel, text, source_file=safe_filename)
    return {
        "content_item_id": result["item_id"],
        "version_id": result["version_id"],
        "extracted_length": len(text),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Run analysis — the key endpoint the frontend calls after submitting
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/content/{item_id}/analyse")
def analyse_content(item_id: str, principal: Principal = Depends(require("submit_content"))):
    """Run deterministic claim-checking on the current version of a content item."""
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        item = conn.execute(
            "SELECT current_version_id FROM content_items WHERE id=%s AND org_id=%s",
            (item_id, principal.org_id),
        ).fetchone()
        if not item:
            raise ApiError(404, "not_found", "Content item not found")
        if not item["current_version_id"]:
            raise ApiError(422, "validation_failed", "Content item has no version to analyse")
        version_id = str(item["current_version_id"])

    # Run the checker service (deterministic, no LLM needed)
    from ..services.checker import run_checks
    try:
        result = run_checks(version_id, str(principal.org_id), str(principal.user_id))
    except Exception:
        logger.exception("Content analysis failed for item %s", item_id)
        raise ApiError(500, "analysis_failed", "Content analysis failed; retry or contact an administrator")

    # Mark content as findings_ready
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        conn.execute(
            "UPDATE content_items SET status='findings_ready' WHERE id=%s AND org_id=%s AND current_version_id=%s",
            (item_id, principal.org_id, version_id),
        )

    return {
        "run_id": result["run_id"],
        "content_version_id": version_id,
        "findings_count": result["findings_count"],
        "findings": result["findings"],
    }


# ──────────────────────────────────────────────────────────────────────────────
# New version of existing item
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/content/{item_id}/versions", status_code=201)
def submit_new_version(item_id: str, body: ContentItemIn,
                        principal: Principal = Depends(require("submit_content"))):
    text = (body.body_text or "").strip()
    if not text:
        raise ApiError(422, "validation_failed", "body_text is required")
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        item = conn.execute(
            "SELECT id FROM content_items WHERE id=%s AND org_id=%s FOR UPDATE",
            (item_id, principal.org_id),
        ).fetchone()
        if not item:
            raise ApiError(404, "not_found", "Content item not found")
        max_v = conn.execute(
            "SELECT COALESCE(MAX(version_no),0) AS max_version FROM content_versions WHERE content_item_id=%s",
            (item_id,),
        ).fetchone()["max_version"]
        version_id = uuid.uuid4()
        content_hash = hashlib.sha256(text.encode()).hexdigest()
        conn.execute(
            """INSERT INTO content_versions
               (id, org_id, content_item_id, version_no, body_text, content_hash, created_by)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            (version_id, principal.org_id, item_id, max_v + 1, text, content_hash,
             principal.user_id),
        )
        conn.execute(
            "UPDATE content_items SET current_version_id=%s, status='draft' WHERE id=%s",
            (version_id, item_id),
        )
        write_audit(conn, principal.user_id, "content.version_added", "content_version",
                    version_id, after={"item_id": item_id, "version_no": max_v + 1})
    return {"item_id": item_id, "version_id": str(version_id), "version_no": max_v + 1}


# ──────────────────────────────────────────────────────────────────────────────
# Internal helper
# ──────────────────────────────────────────────────────────────────────────────

def _create_item(principal: Principal, title: str, channel: str, text: str,
                 source_file: str = None) -> dict:
    if len(text) > MAX_CONTENT_TEXT:
        raise ApiError(413, "content_too_large", "Content text must be 1 MB or smaller")
    item_id = uuid.uuid4()
    version_id = uuid.uuid4()
    content_hash = hashlib.sha256(text.encode()).hexdigest()
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        conn.execute(
            "INSERT INTO content_items (id, org_id, title, channel, status, created_by) VALUES (%s,%s,%s,%s,'draft',%s)",
            (item_id, principal.org_id, title, channel, principal.user_id),
        )
        conn.execute(
            """INSERT INTO content_versions
               (id, org_id, content_item_id, version_no, body_text, source_file_key,
                content_hash, created_by)
               VALUES (%s,%s,%s,1,%s,%s,%s,%s)""",
            (version_id, principal.org_id, item_id, text, source_file,
             content_hash, principal.user_id),
        )
        conn.execute(
            "UPDATE content_items SET current_version_id=%s WHERE id=%s",
            (version_id, item_id),
        )
        write_audit(conn, principal.user_id, "content.submitted", "content_item", item_id,
                    after={"title": title, "channel": channel})
    return {"item_id": str(item_id), "version_id": str(version_id)}
