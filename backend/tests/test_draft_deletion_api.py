"""Endpoint orchestration only; DB functions require PostgreSQL integration tests."""
from contextlib import contextmanager
from uuid import uuid4
import pytest
from app.api import content, facts
from app.core.errors import ApiError
from app.core.rbac import Principal, can


@pytest.mark.parametrize('role,allowed', [('admin', True), ('brand_manager', True), ('creator', False), ('approver', False)])
def test_delete_permissions(role, allowed):
    assert can(role, 'delete_content') is allowed
    assert can(role, 'propose_version') is allowed


@pytest.mark.parametrize('result,status', [('not_found', 404), ('forbidden', 403), ('protected', 409)])
def test_delete_endpoint_surfaces_guard_rejection(monkeypatch, result, status):
    class Result:
        def fetchone(self): return {'result': result}
    class Conn:
        def execute(self, sql, params):
            assert 'delete_unused_content_draft' in sql
            assert len(params) == 1
            return Result()
    @contextmanager
    def tenant(org, user): yield Conn()
    monkeypatch.setattr(content, 'tenant_conn', tenant)
    with pytest.raises(ApiError) as error:
        content.delete_content_draft(uuid4(), Principal('user', 'org', 'admin'))
    assert error.value.status == status


def test_delete_fact_endpoint_uses_guard(monkeypatch):
    class Result:
        def fetchone(self): return {'result': 'deleted'}
    class Conn:
        def execute(self, sql, params):
            assert 'delete_unused_fact_draft' in sql and params[1] == 2
            return Result()
    @contextmanager
    def tenant(org, user): yield Conn()
    monkeypatch.setattr(facts, 'tenant_conn', tenant)
    assert facts.delete_fact_draft(uuid4(), 2, Principal('user', 'org', 'admin')) == {'status': 'deleted'}
