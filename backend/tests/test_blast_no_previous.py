"""No earlier version is a prerequisite failure, not a successful empty scan."""
from contextlib import contextmanager
from uuid import uuid4

from app.api import blast_radius
from app.core.rbac import Principal


class Result:
    def __init__(self, value): self.value = value
    def fetchone(self): return self.value


def test_no_previous_version_does_not_claim_scan_or_insert(monkeypatch):
    class Conn:
        def execute(self, query, args=()):
            if 'FROM facts f' in query:
                return Result({'id': uuid4(), 'key': 'customer_count', 'label': 'Customer count',
                               'new_value_text': '50,000 customers', 'new_value_number': 50000})
            if 'FROM fact_versions' in query:
                return Result(None)
            raise AssertionError('No scan or write should happen without a previous version')

    @contextmanager
    def fake_tenant(*_args): yield Conn()
    monkeypatch.setattr(blast_radius, 'tenant_conn', fake_tenant)
    response = blast_radius.run_blast_radius(uuid4(), Principal('user', 'org', 'admin'))
    assert response['scan_performed'] is False
    assert response['affected'] == [] and response['affected_count'] == 0
    assert 'No scan was performed' in response['scope_note']
    assert 'run_id' not in response
