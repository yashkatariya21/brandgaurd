import os
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.db import close_pool, tenant_conn


# Modules that only exercise pure functions (no database) — they must run
# even when the DB environment is not configured.
PURE_MODULES = {
    "test_blast_radius",
    "test_checker",
    "test_redteam",
    "test_chaos",
    "test_round3_rulebook",
    "test_dependency_graph",
    "test_grounding",
}


def pytest_collection_modifyitems(config, items):
    missing = [k for k in ("DATABASE_URL", "MIGRATION_DATABASE_URL", "APP_DB_PASSWORD", "JWT_SECRET") if not os.environ.get(k)]
    if not missing:
        return
    skip = pytest.mark.skip(reason=f"missing env: {missing}")
    for item in items:
        module = item.module.__name__.split(".")[-1]
        if module in PURE_MODULES:
            continue
        item.add_marker(skip)


@pytest.fixture(scope="session", autouse=True)
def _env():
    # Pure-function tests are filtered in pytest_collection_modifyitems; this
    # fixture only manages the DB pool lifecycle for the tests that need it.
    yield
    try:
        close_pool()
    except Exception:
        pass


@pytest.fixture(scope="session")
def client():
    from app.main import app
    with TestClient(app) as c:
        yield c


def make_org(conn_org=None):
    """Insert an organisation + one user directly, returning ids."""
    org_id, user_id = uuid.uuid4(), uuid.uuid4()
    with tenant_conn(org_id, user_id) as conn:
        conn.execute("INSERT INTO organisations (id, name, slug) VALUES (%s,%s,%s)", (org_id, "T", f"t-{org_id.hex[:12]}"))
        conn.execute("INSERT INTO users (id, email, display_name, password_hash) VALUES (%s,%s,'T','x')", (user_id, f"{user_id.hex}@t.example"))
        conn.execute("INSERT INTO memberships (org_id, user_id, role) VALUES (%s,%s,'admin')", (org_id, user_id))
    return org_id, user_id


@pytest.fixture
def two_orgs():
    a, b = make_org(), make_org()
    for org_id, user_id in (a, b):
        with tenant_conn(org_id, user_id) as conn:
            conn.execute("INSERT INTO facts (org_id, key, label, category) VALUES (%s,'k','Fact','statistic')", (org_id,))
    return a, b
