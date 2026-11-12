"""Exercise multipart uploads through the real router without a database."""
from io import BytesIO

import docx
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import content
from app.core.errors import install_error_handlers
from app.core.rbac import Principal, get_principal


def make_client(monkeypatch):
    app = FastAPI()
    install_error_handlers(app)
    app.include_router(content.router)
    principal = Principal(user_id='user', org_id='organisation', role='creator')
    app.dependency_overrides[get_principal] = lambda: principal
    captured = []

    def create_item(principal, title, channel, text, source_file=None):
        captured.append((principal.org_id, title, channel, text, source_file))
        return {'item_id': 'item', 'version_id': 'version'}

    monkeypatch.setattr(content, '_create_item', create_item)
    return TestClient(app), captured


def test_upload_txt_uses_multipart_and_passes_channel(monkeypatch):
    client, captured = make_client(monkeypatch)
    response = client.post('/v1/content/upload', data={'title': 'A draft', 'channel': 'email'},
                           files={'file': ('draft.txt', b'Hello world', 'text/plain')})
    assert response.status_code == 201
    assert response.json()['extracted_length'] == 11
    assert captured == [('organisation', 'A draft', 'email', 'Hello world', 'draft.txt')]


def test_upload_rejects_unsupported_files(monkeypatch):
    client, captured = make_client(monkeypatch)
    response = client.post('/v1/content/upload', data={'title': 'A draft', 'channel': 'web'},
                           files={'file': ('draft.exe', b'Hello', 'application/octet-stream')})
    assert response.status_code == 422
    assert 'Supported upload types' in response.json()['message']
    assert not captured


def test_upload_rejects_empty_and_oversized_files(monkeypatch):
    client, captured = make_client(monkeypatch)
    for body, status in [(b'', 422), (b'x' * (content.MAX_UPLOAD_BYTES + 1), 413)]:
        response = client.post('/v1/content/upload', data={'title': 'A draft', 'channel': 'pdf'},
                               files={'file': ('draft.txt', body, 'text/plain')})
        assert response.status_code == status
    assert not captured


def test_upload_docx_extracts_text(monkeypatch):
    client, captured = make_client(monkeypatch)
    document = docx.Document()
    document.add_paragraph('Draft content')
    stream = BytesIO()
    document.save(stream)
    response = client.post('/v1/content/upload', data={'title': 'Document', 'channel': 'web'},
                           files={'file': ('draft.docx', stream.getvalue(),
                                           'application/vnd.openxmlformats-officedocument.wordprocessingml.document')})
    assert response.status_code == 201
    assert captured[0][3] == 'Draft content'
