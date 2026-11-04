from psycopg.types.json import Jsonb


def write_audit(conn, actor_id, action: str, object_type: str, object_id=None, before=None, after=None) -> None:
    """Append one audit row. org_id comes from the transaction's tenant context."""
    conn.execute(
        """INSERT INTO audit_log (org_id, actor_id, action, object_type, object_id, before, after)
           VALUES (NULLIF(current_setting('app.org_id', true), '')::uuid, %s, %s, %s, %s, %s, %s)""",
        (
            actor_id,
            action,
            object_type,
            object_id,
            Jsonb(before) if before is not None else None,
            Jsonb(after) if after is not None else None,
        ),
    )
