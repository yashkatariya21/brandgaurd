"""Orchestration tests; persistence and isolation are checked separately against Postgres."""
from contextlib import contextmanager
from uuid import uuid4

import pytest
from app.api import chaos
from app.core.errors import ApiError
from app.core.rbac import Principal


class Result:
    def __init__(self, value): self.value = value
    def fetchone(self): return self.value
    def fetchall(self): return self.value


class FakeConnection:
    def __init__(self):
        self.a, self.b = uuid4(), uuid4()
        self.saved = None
        self.rules = [
            {'key': 'a', 'applies_to': ['web'], 'version_id': self.a, 'description': 'Use contractions.'},
            {'key': 'b', 'applies_to': ['web'], 'version_id': self.b, 'description': 'Maintain a formal tone.'},
        ]

    def execute(self, sql, args=()):
        if 'SELECT r.key, r.applies_to' in sql:
            return Result(self.rules)
        if 'SELECT ci.id, ci.rule_version_ids' in sql:
            return Result([self.saved] if self.saved else [])
        if 'SELECT ci.id, ci.status' in sql:
            return Result(self.saved)
        if 'INSERT INTO chaos_issues' in sql:
            self.saved = {'id': args[0], 'rule_version_ids': args[3], 'status': args[5]}
        if 'UPDATE chaos_issues SET status' in sql:
            self.saved['status'] = args[0]
        return Result(None)


def test_conflict_decision_is_saved_and_reused(monkeypatch):
    conn = FakeConnection()
    @contextmanager
    def tenant(*_args): yield conn
    monkeypatch.setattr(chaos, 'tenant_conn', tenant)
    monkeypatch.setattr(chaos, 'write_audit', lambda *_args, **_kwargs: None)
    principal = Principal('user', 'org', 'admin')
    candidates = chaos.rulebook_contradictions(principal)['contradictions']
    assert len(candidates) == 1 and candidates[0]['status'] == 'open'
    first = chaos.resolve_conflict(chaos.ConflictDecision(version_a=conn.a, version_b=conn.b, status='accepted'), principal)
    assert chaos.rulebook_contradictions(principal)['contradictions'][0]['status'] == 'accepted'
    second = chaos.resolve_conflict(chaos.ConflictDecision(version_a=conn.b, version_b=conn.a, status='rejected'), principal)
    assert first['issue_id'] == second['issue_id']
    assert chaos.rulebook_contradictions(principal)['contradictions'][0]['status'] == 'rejected'
    with pytest.raises(ApiError) as exc:
        chaos.resolve_conflict(chaos.ConflictDecision(version_a=conn.a, version_b=uuid4(), status='accepted'), principal)
    assert exc.value.status == 404
