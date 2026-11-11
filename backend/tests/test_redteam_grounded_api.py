"""API orchestration checks with an in-memory fake; not database integration tests."""
from contextlib import contextmanager
from types import SimpleNamespace
from app.api import redteam
from app.core.rbac import Principal


class Result:
    def __init__(self, value): self.value = value
    def fetchone(self): return self.value
    def fetchall(self): return self.value


class FakeConnection:
    def __init__(self):
        self.cache = None
        self.drops = 0
        self.saved_findings = []
    def execute(self, query, args=()):
        if 'FROM content_items ci' in query:
            return Result({'id': 'item', 'current_version_id': 'version', 'body_text': 'We are better than competitors.'})
        if 'FROM facts f JOIN' in query:
            return Result([])
        if 'FROM rules r JOIN' in query:
            return Result([{'id':'r13', 'key':'R-13', 'version_no':1, 'text':'Do not name competitors.'}])
        if "config->>'cache_key'" in query:
            return Result({'config': self.cache} if self.cache else None)
        if 'INSERT INTO redteam_drops' in query:
            self.drops += 1
        if 'INSERT INTO findings ' in query:
            self.saved_findings.append(args)
        if "UPDATE analysis_runs SET status='done'" in query:
            self.cache = args[0].obj
        return Result(None)


def test_demo_grounded_and_cached(monkeypatch):
    conn = FakeConnection()
    @contextmanager
    def fake_tenant(*_args): yield conn
    monkeypatch.setattr(redteam, 'tenant_conn', fake_tenant)
    monkeypatch.setattr(redteam, 'write_audit', lambda *_args, **_kwargs: None)
    monkeypatch.setattr(redteam, '_has_llm', lambda: False)
    principal = Principal(user_id='user', org_id='org', role='admin')
    result = redteam.run_redteam('item', n=3, principal=principal)
    assert result['mode'] == 'demo' and not result['cached']
    assert result['findings']
    competitor = next(f for f in result['findings'] if f['persona'] == 'Competitor Watch')
    assert competitor['finding_type'] == 'possible' and competitor['appearances'] == 3
    assert any(c['kind'] == 'rule' and c['ref_id'] == 'r13' for c in competitor['citations'])
    assert 'not measured reliability' in result['demo_note']
    saved = len(conn.saved_findings)
    cached = redteam.run_redteam('item', n=3, principal=principal)
    assert cached['cached'] and len(conn.saved_findings) == saved


def test_provider_failure_is_labelled_demo(monkeypatch):
    conn = FakeConnection()
    @contextmanager
    def fake_tenant(*_args): yield conn
    monkeypatch.setattr(redteam, 'tenant_conn', fake_tenant)
    monkeypatch.setattr(redteam, 'write_audit', lambda *_args, **_kwargs: None)
    monkeypatch.setattr(redteam, '_has_llm', lambda: True)
    monkeypatch.setenv('REDTEAM_LIVE_ENABLED', 'true')
    original = redteam._run_persona
    def failed_live(persona, text, facts, rules, live, version):
        if live: raise redteam.ProviderCallError('simulated timeout')
        return original(persona, text, facts, rules, live, version)
    monkeypatch.setattr(redteam, '_run_persona', failed_live)
    result = redteam.run_redteam('item', n=3, principal=Principal('user', 'org', 'admin'))
    assert result['mode'] == 'demo' and result['metrics']['model'] == 'deterministic heuristic'
