"""Load the NimbusDesk demo organisation.  Usage: python -m app.seed [--reset]

--reset wipes ALL data (demo environments only) and requires ALLOW_RESET=1.
Demo users share the password in SEED_PASSWORD (minimum 10 characters).
"""
import hashlib
import os
import sys
import uuid

import psycopg
from psycopg.types.json import Jsonb

from .core.audit import write_audit
from .core.config import load_settings
from .core.db import close_pool, tenant_conn
from .core.security import hash_password
from .seed_data import (ASSETS, CUSTOMER_COUNT_V2, EMBARGO_TERMS, FACT_ALIASES, FACTS, ROLES, RULES, USER_EMAILS)


def reset() -> None:
    if os.environ.get("ALLOW_RESET") != "1":
        sys.exit("Refusing to reset: set ALLOW_RESET=1 (this deletes all data).")
    with psycopg.connect(load_settings().migration_database_url, autocommit=True) as conn:
        conn.execute("TRUNCATE organisations, users RESTART IDENTITY CASCADE")
    print("all data removed")


def seed() -> None:
    password = os.environ.get("SEED_PASSWORD", "")
    if len(password) < 10:
        sys.exit("Set SEED_PASSWORD to at least 10 characters.")
    org_id = uuid.uuid4()
    uid = {role: uuid.uuid4() for role in ROLES}
    pw_hash = hash_password(password)

    with tenant_conn(org_id, None) as conn:
        if conn.execute("SELECT 1 FROM organisations WHERE slug = 'nimbusdesk'").fetchone():
            print("NimbusDesk already seeded; use --reset to start over.")
            return
        conn.execute("INSERT INTO organisations (id, name, slug, ai_disclosure_ack) VALUES (%s, 'NimbusDesk (fictional)', 'nimbusdesk', true)", (org_id,))
        for role in ROLES:
            conn.execute("INSERT INTO users (id, email, display_name, password_hash) VALUES (%s, %s, %s, %s)",
                         (uid[role], USER_EMAILS[role], role.replace("_", " ").title(), pw_hash))
            conn.execute("INSERT INTO memberships (org_id, user_id, role) VALUES (%s, %s, %s)", (org_id, uid[role], role))

        brand, approver = uid["brand_manager"], uid["approver"]
        fact_ids = {}
        for key, label, cat, text, num, unit, qual, src, vfrom, vexp in FACTS:
            fid, vid = uuid.uuid4(), uuid.uuid4()
            fact_ids[key] = fid
            conn.execute("INSERT INTO facts (id, org_id, key, label, category, owner_user_id, created_by) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                         (fid, org_id, key, label, cat, brand, brand))
            conn.execute(
                """INSERT INTO fact_versions (id, org_id, fact_id, version_no, value_text, value_number, value_unit, qualifier,
                       source_ref, valid_from, expires_at, status, proposed_by, approved_by, approved_at, content_hash)
                   VALUES (%s,%s,%s,1,%s,%s,%s,%s,%s,%s,%s,'approved',%s,%s,now(),%s)""",
                (vid, org_id, fid, text, num, unit, qual, src, vfrom, vexp, brand, approver, hashlib.sha256(text.encode()).hexdigest()))
            conn.execute("UPDATE facts SET current_version_id = %s WHERE id = %s", (vid, fid))
        for key, aliases in FACT_ALIASES.items():
            for alias, kind in aliases:
                conn.execute("INSERT INTO fact_aliases (org_id, fact_id, alias_text, kind) VALUES (%s,%s,%s,%s)", (org_id, fact_ids[key], alias, kind))

        # Draft replacement for the live demo: approving it changes the customer count and triggers impact analysis.
        text, num, unit, qual, src, vfrom, vexp = CUSTOMER_COUNT_V2
        conn.execute(
            """INSERT INTO fact_versions (org_id, fact_id, version_no, value_text, value_number, value_unit, qualifier,
                   source_ref, valid_from, expires_at, status, change_note, proposed_by)
               VALUES (%s,%s,2,%s,%s,%s,%s,%s,%s,%s,'draft','Customer count passed 65,000',%s)""",
            (org_id, fact_ids["customer_count"], text, num, unit, qual, src, vfrom, vexp, brand))

        for term, kind, until, fact_key in EMBARGO_TERMS:
            conn.execute("INSERT INTO embargo_terms (org_id, term, kind, embargo_until, fact_id) VALUES (%s,%s,%s,%s,%s)",
                         (org_id, term, kind, until, fact_ids[fact_key]))

        for key, label, cat, applies, sev, desc, behaviour, examples in RULES:
            rid, rvid = uuid.uuid4(), uuid.uuid4()
            conn.execute("INSERT INTO rules (id, org_id, key, label, category, applies_to, severity, created_by) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                         (rid, org_id, key, label, cat, Jsonb(applies), sev, brand))
            conn.execute(
                """INSERT INTO rule_versions (id, org_id, rule_id, version_no, description, expected_behaviour, status,
                       proposed_by, approved_by, approved_at) VALUES (%s,%s,%s,1,%s,%s,'approved',%s,%s,now())""",
                (rvid, org_id, rid, desc, behaviour, brand, approver))
            conn.execute("UPDATE rules SET current_version_id = %s WHERE id = %s", (rvid, rid))
            for kind, ex in examples:
                conn.execute("INSERT INTO rule_examples (org_id, rule_version_id, kind, text) VALUES (%s,%s,%s,%s)", (org_id, rvid, kind, ex))

        for code, title, channel, status, reg, sched, url, body in ASSETS:
            cid, cvid = uuid.uuid4(), uuid.uuid4()
            conn.execute(
                """INSERT INTO content_items (id, org_id, title, channel, status, registered_state, scheduled_for, published_url, created_by)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                (cid, org_id, f"{code} {title}", channel, status, reg, sched, url, uid["creator"]))
            conn.execute(
                "INSERT INTO content_versions (id, org_id, content_item_id, version_no, body_text, content_hash, created_by) VALUES (%s,%s,%s,1,%s,%s,%s)",
                (cvid, org_id, cid, body, hashlib.sha256(body.encode()).hexdigest(), uid["creator"]))
            conn.execute("UPDATE content_items SET current_version_id = %s WHERE id = %s", (cvid, cid))

        write_audit(conn, uid["admin"], "seed.loaded", "organisation", org_id,
                    after={"facts": len(FACTS), "rules": len(RULES), "assets": len(ASSETS)})
    print(f"seeded NimbusDesk: {len(FACTS)} facts, {len(RULES)} rules, {len(ASSETS)} registered assets, 6 users")


if __name__ == "__main__":
    try:
        if "--reset" in sys.argv:
            reset()
        seed()
    finally:
        close_pool()
