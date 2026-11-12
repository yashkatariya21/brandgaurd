"""Database integration checks for version-specific contradiction decisions."""
import pytest
from psycopg.types.json import Jsonb
from app.api.chaos import ConflictDecision, resolve_conflict, rulebook_contradictions
from app.core.db import tenant_conn
from app.core.errors import ApiError
from app.core.rbac import Principal


def create_rule(conn, org, user, key, description):
    rule = conn.execute("""INSERT INTO rules (org_id,key,label,category,severity,applies_to)
        VALUES (%s,%s,%s,'tone','low',%s) RETURNING id""", (org, key, key, Jsonb(['web']))).fetchone()['id']
    version = conn.execute("""INSERT INTO rule_versions (org_id,rule_id,version_no,description,status,proposed_by)
        VALUES (%s,%s,1,%s,'approved',%s) RETURNING id""", (org, rule, description, user)).fetchone()['id']
    conn.execute('UPDATE rules SET current_version_id=%s WHERE id=%s', (version, rule))
    return rule, version


def test_conflict_decision_persists_and_is_tenant_scoped(two_orgs):
    (org, user), (other_org, other_user) = two_orgs
    with tenant_conn(org, user) as conn:
        _, first = create_rule(conn, org, user, 'a', 'Use contractions.')
        _, second = create_rule(conn, org, user, 'b', 'Maintain a formal tone.')
    principal = Principal(str(user), str(org), 'admin')
    other = Principal(str(other_user), str(other_org), 'admin')
    initial = rulebook_contradictions(principal)['contradictions']
    assert len(initial) == 1 and initial[0]['status'] == 'open'
    decision = ConflictDecision(version_a=first, version_b=second, status='accepted')
    result = resolve_conflict(decision, principal)
    assert rulebook_contradictions(principal)['contradictions'][0]['status'] == 'accepted'
    changed = resolve_conflict(ConflictDecision(version_a=second, version_b=first, status='rejected'), principal)
    assert changed['issue_id'] == result['issue_id']
    assert rulebook_contradictions(principal)['contradictions'][0]['status'] == 'rejected'
    assert rulebook_contradictions(other)['contradictions'] == []
    with pytest.raises(ApiError) as exc:
        resolve_conflict(decision, other)
    assert exc.value.status == 404
