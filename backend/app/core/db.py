from contextlib import contextmanager

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import load_settings

_pool = None


def open_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        pool = ConnectionPool(
            load_settings().database_url,
            min_size=1,
            max_size=10,
            open=False,
            kwargs={"row_factory": dict_row},
        )
        pool.open(wait=True, timeout=15)
        _pool = pool
    return _pool


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def tenant_conn(org_id=None, user_id=None):
    """One transaction with the tenant context set for row-level security.

    app.org_id and app.user_id are transaction-local, so a pooled connection can
    never carry one tenant's context into another request.
    """
    with open_pool().connection() as conn:
        conn.execute(
            "SELECT set_config('app.org_id', %s, true), set_config('app.user_id', %s, true)",
            (str(org_id) if org_id else "", str(user_id) if user_id else ""),
        )
        yield conn
