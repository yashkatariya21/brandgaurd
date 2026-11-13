from contextlib import contextmanager
from uuid import uuid4
from app.api import findings
from app.core.rbac import Principal


def test_finding_detail_revalidates_and_sanitises_cached_demo(monkeypatch):
    org, user, finding_id, cv_id = (uuid4() for _ in range(4))
    class Rows:
        def __init__(self, one=None, rows=None): self.one, self.rows = one, rows
        def fetchone(self): return self.one
        def fetchall(self): return self.rows
    class Conn:
        def execute(self, query, args):
            if 'SELECT f.*' in query:
                assert args == (finding_id, org)
                return Rows(one={'id':finding_id, 'source_kind':'deterministic', 'grounded':False,
                    'content_version_id':cv_id, 'content_text':'Example passage', 'span_start':0, 'span_end':7,
                    'citations':[], 'content_title':'Title'})
            if 'FROM decisions' in query:
                assert args == (finding_id, org)
                return Rows(rows=[])
            if 'FROM debates' in query:
                assert args == (finding_id, org)
                return Rows(one={'model_id':'stub', 'prosecutor_text':'unsupported legal liability',
                                 'defender_text':'unsupported', 'minimal_edit':'unverified edit'})
            raise AssertionError(query)
    @contextmanager
    def tenant(*args):
        assert args == (org, user)
        yield Conn()
    monkeypatch.setattr(findings, 'tenant_conn', tenant)
    result = findings.get_finding(finding_id, Principal(user, org, 'admin'))
    assert 'content_text' not in result
    debate = result['debate']
    assert 'unsupported' not in debate['prosecutor_text']
    assert debate['minimal_edit'] is None
    assert debate['argument_citations']['prosecutor'][0]['quote'] == 'Example'
    assert debate['mode'] == 'demo'
