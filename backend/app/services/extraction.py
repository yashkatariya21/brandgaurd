"""T08 – Text extraction from plain text, DOCX, and PDF files."""
from __future__ import annotations

import io
import zipfile


class ExtractionError(ValueError):
    """Raised when an upload is unsupported, malformed, or exceeds extraction limits."""


MAX_EXTRACTED_TEXT = 1_000_000
MAX_DOCX_UNCOMPRESSED = 25_000_000
MAX_DOCX_ENTRIES = 500


def extract_text(raw: bytes, filename: str) -> str:
    """Extract a bounded amount of text from supported user uploads only."""
    fname = (filename or "").lower()
    if fname.endswith(".pdf"):
        text = _from_pdf(raw)
    elif fname.endswith(".docx"):
        text = _from_docx(raw)
    elif fname.endswith(".txt"):
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise ExtractionError("Text upload must be valid UTF-8") from exc
    else:
        raise ExtractionError("Supported upload types are .txt, .pdf, and .docx")
    if len(text) > MAX_EXTRACTED_TEXT:
        raise ExtractionError("Extracted text exceeds the 1 MB limit")
    return text


def _from_pdf(raw: bytes) -> str:
    if not raw.startswith(b"%PDF-"):
        raise ExtractionError("Uploaded file is not a valid PDF")
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(raw))
        if len(reader.pages) > 200:
            raise ExtractionError("PDF exceeds the 200-page limit")
        parts = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                parts.append(t)
            if sum(map(len, parts)) > MAX_EXTRACTED_TEXT:
                raise ExtractionError("Extracted text exceeds the 1 MB limit")
        return "\n".join(parts)
    except ExtractionError:
        raise
    except Exception as exc:
        raise ExtractionError("Could not read the uploaded PDF") from exc


def _from_docx(raw: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            entries = archive.infolist()
            if len(entries) > MAX_DOCX_ENTRIES:
                raise ExtractionError("DOCX contains too many archive entries")
            total_size = sum(entry.file_size for entry in entries)
            if total_size > MAX_DOCX_UNCOMPRESSED:
                raise ExtractionError("DOCX exceeds the expanded-file size limit")
            if any(entry.file_size > 1_000_000 and entry.file_size / max(entry.compress_size, 1) > 100
                   for entry in entries):
                raise ExtractionError("DOCX compression ratio exceeds the safety limit")
            if "word/document.xml" not in archive.namelist():
                raise ExtractionError("Uploaded file is not a valid DOCX")
        import docx
        doc = docx.Document(io.BytesIO(raw))
        return "\n".join(p.text for p in doc.paragraphs if p.text)
    except ExtractionError:
        raise
    except Exception as exc:
        raise ExtractionError("Could not read the uploaded DOCX") from exc
