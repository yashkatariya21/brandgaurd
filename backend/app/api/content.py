"""T08 – Content Submission and Text Extraction."""
from __future__ import annotations

import hashlib
import io
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel

from ..core.audit import write_audit
from ..core.db import tenant_conn
from ..core.errors import ApiError
from ..core.rbac import Principal, require
from ..services.claim_extractor import extract_claims
from ..services.checker import _insert_claims

router = APIRouter(prefix="/v1")


# ─── Pydantic models ──────────────────────────────────────────────────────────

class ContentSubmit(BaseModel):
    title: str
    channel: str = "web"
    body_text: str
    registered_state: str = "none"
    scheduled_for: Optional[str] = None
    published_url: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


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


def _create_content_and_version(conn, org_id, user_id, title, channel, body_text,
                                 registered_state="none", scheduled_for=None,
                                 published_url=None, source_file_key=None):
    """Create content_item + content_version, run claim extraction. Returns (item_id, version_id)."""
    item_id = uuid.uuid4()
    version_id = uuid.uuid4()
    content_hash = _sha256(body_text)

    conn.execute(
        """INSERT INTO content_items
           (id, org_id, title, channel, status, registered_state, scheduled_for,
            published_url, created_by)
           VALUES (%s,%s,%s,%s,'draft',%s,%s,%s,%s)""",
        (item_id, org_id, title, channel, registered_state,
         scheduled_for, published_url, user_id),
    )
    conn.execute(
        """INSERT INTO content_versions
           (id, org_id, content_item_id, version_no, body_text, content_hash,
            source_file_key, created_by)
           VALUES (%s,%s,%s,1,%s,%s,%s,%s)""",
        (version_id, org_id, item_id, body_text, content_hash, source_file_key, user_id),
    )
    # Set current_version_id
    conn.execute(
        "UPDATE content_items SET current_version_id=%s WHERE id=%s", (version_id, item_id)
    )

    # Extract claims and insert
    claims = extract_claims(body_text)
    _insert_claims(conn, org_id, version_id, claims)

    write_audit(conn, user_id, "content.submitted", "content_item", item_id,
                after={"title": title, "channel": channel})
    return str(item_id), str(version_id)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/content", status_code=201)
def submit_content(body: ContentSubmit, principal: Principal = Depends(require("submit_content"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        item_id, version_id = _create_content_and_version(
            conn, principal.org_id, principal.user_id,
            body.title, body.channel, body.body_text,
            body.registered_state, body.scheduled_for, body.published_url,
        )
    return {"content_item_id": item_id, "version_id": version_id}


@router.post("/content/upload", status_code=201)
async def upload_content(
    title: str,
    channel: str = "web",
    file: UploadFile = File(...),
    principal: Principal = Depends(require("upload_documents")),
):
    """Accept DOCX or PDF, extract text, create content item + version."""
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    raw = await file.read()
    body_text = ""

    if ext == "docx":
        try:
            import docx  # python-docx
            doc = docx.Document(io.BytesIO(raw))
            body_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            raise ApiError(422, "extraction_failed", f"Could not extract DOCX text: {e}")
    elif ext == "pdf":
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(raw)) as pdf:
                pages = [page.extract_text() or "" for page in pdf.pages]
            body_text = "\n".join(pages)
        except Exception as e:
            raise ApiError(422, "extraction_failed", f"Could not extract PDF text: {e}")
    else:
        raise ApiError(415, "unsupported_type", "Only DOCX and PDF files are supported")

    if not body_text.strip():
        raise ApiError(422, "extraction_failed", "No text could be extracted from the file")

    with tenant_conn(principal.org_id, principal.user_id) as conn:
        item_id, version_id = _create_content_and_version(
            conn, principal.org_id, principal.user_id,
            title, channel, body_text, source_file_key=filename,
        )
    return {"content_item_id": item_id, "version_id": version_id, "extracted_length": len(body_text)}


@router.get("/content")
def list_content(principal: Principal = Depends(require("submit_content"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        rows = conn.execute(
            """SELECT ci.id, ci.title, ci.channel, ci.status, ci.registered_state,
                      ci.scheduled_for, ci.published_url, ci.created_at,
                      cv.version_no, cv.content_hash
               FROM content_items ci
               LEFT JOIN content_versions cv ON cv.id = ci.current_version_id
               WHERE ci.org_id=%s
               ORDER BY ci.created_at DESC""",
            (principal.org_id,),
        ).fetchall()
    return [_serialize(dict(r)) for r in rows]


@router.get("/content/{item_id}")
def get_content(item_id: uuid.UUID, principal: Principal = Depends(require("submit_content"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        item = conn.execute(
            """SELECT ci.*, cv.id as version_id, cv.version_no, cv.body_text,
                      cv.content_hash, cv.created_at as version_created_at
               FROM content_items ci
               LEFT JOIN content_versions cv ON cv.id = ci.current_version_id
               WHERE ci.id=%s AND ci.org_id=%s""",
            (item_id, principal.org_id),
        ).fetchone()
        if not item:
            raise ApiError(404, "not_found", "Content item not found")

        claims = conn.execute(
            """SELECT cc.id, cc.span_start, cc.span_end, cc.raw_text, cc.entity,
                      cc.value_number, cc.value_unit, cc.link_status, cc.fact_id
               FROM content_claims cc
               WHERE cc.content_version_id=%s""",
            (item["version_id"],),
        ).fetchall() if item.get("version_id") else []

        findings = conn.execute(
            """SELECT f.id, f.issue, f.severity, f.finding_type, f.source_kind,
                      f.status, f.created_at, f.span_start, f.span_end
               FROM findings f
               JOIN analysis_runs ar ON ar.id = f.analysis_run_id
               WHERE ar.content_version_id=%s
               ORDER BY f.created_at DESC""",
            (item["version_id"],),
        ).fetchall() if item.get("version_id") else []

    return {
        **_serialize(dict(item)),
        "claims": [_serialize(dict(c)) for c in claims],
        "findings": [_serialize(dict(f)) for f in findings],
    }


@router.get("/content/{item_id}/versions")
def list_content_versions(item_id: uuid.UUID, principal: Principal = Depends(require("submit_content"))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        if not conn.execute(
            "SELECT 1 FROM content_items WHERE id=%s AND org_id=%s", (item_id, principal.org_id)
        ).fetchone():
            raise ApiError(404, "not_found", "Content item not found")
        versions = conn.execute(
            """SELECT id, version_no, content_hash, source_file_key, created_at, created_by
               FROM content_versions WHERE content_item_id=%s ORDER BY version_no""",
            (item_id,),
        ).fetchall()
    return [_serialize(dict(v)) for v in versions]


@router.post("/content/{item_id}/analyse")
def analyse_content(item_id: uuid.UUID, principal: Principal = Depends(require("submit_content"))):
    """Trigger claim extraction + deterministic checks for the current version."""
    from ..services.checker import run_checks

    with tenant_conn(principal.org_id, principal.user_id) as conn:
        item = conn.execute(
            "SELECT current_version_id FROM content_items WHERE id=%s AND org_id=%s",
            (item_id, principal.org_id),
        ).fetchone()
        if not item:
            raise ApiError(404, "not_found", "Content item not found")
        if not item["current_version_id"]:
            raise ApiError(422, "no_version", "Content item has no version yet")
        version_id = str(item["current_version_id"])

        # Update status to analysing
        conn.execute("UPDATE content_items SET status='analysing' WHERE id=%s", (item_id,))

    result = run_checks(version_id, principal.org_id, principal.user_id)

    # Update status to findings_ready
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        conn.execute(
            "UPDATE content_items SET status='findings_ready' WHERE id=%s", (item_id,)
        )

    return result
