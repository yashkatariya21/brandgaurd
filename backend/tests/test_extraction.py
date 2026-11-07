import pytest

from app.services.extraction import ExtractionError, extract_text


def test_plain_text_upload_requires_utf8():
    assert extract_text(b"\xef\xbb\xbfHello", "copy.txt") == "Hello"
    with pytest.raises(ExtractionError, match="UTF-8"):
        extract_text(b"\xff", "copy.txt")


def test_upload_type_is_allow_listed():
    with pytest.raises(ExtractionError, match="Supported upload types"):
        extract_text(b"hello", "copy.exe")


def test_pdf_extension_requires_pdf_signature():
    with pytest.raises(ExtractionError, match="valid PDF"):
        extract_text(b"not a pdf", "copy.pdf")


def test_docx_extension_requires_valid_archive():
    with pytest.raises(ExtractionError, match="Could not read"):
        extract_text(b"not a docx", "copy.docx")


def test_extracted_text_is_bounded():
    with pytest.raises(ExtractionError, match="1 MB"):
        extract_text(b"x" * 1_000_001, "copy.txt")
