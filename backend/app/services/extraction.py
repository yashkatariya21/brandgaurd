"""T08 – Text extraction from plain text, DOCX, and PDF files."""
from __future__ import annotations

import io


def extract_text(raw: bytes, filename: str) -> str:
    """Extract text from raw bytes. Dispatches on filename extension."""
    fname = (filename or "").lower()
    if fname.endswith(".pdf"):
        return _from_pdf(raw)
    if fname.endswith(".docx"):
        return _from_docx(raw)
    # Treat anything else (including .txt) as UTF-8 text
    return raw.decode("utf-8", errors="replace")


def _from_pdf(raw: bytes) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(raw))
        parts = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                parts.append(t)
        return "\n".join(parts)
    except Exception as exc:
        return f"[PDF extraction failed: {exc}]"


def _from_docx(raw: bytes) -> str:
    try:
        import docx
        doc = docx.Document(io.BytesIO(raw))
        return "\n".join(p.text for p in doc.paragraphs if p.text)
    except Exception as exc:
        return f"[DOCX extraction failed: {exc}]"
