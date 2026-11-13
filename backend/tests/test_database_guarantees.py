import uuid

import psycopg.errors
import pytest

from app.core.audit import write_audit
from app.core.db import tenant_conn


def test_org_a_cannot_read_org_b(two_orgs):
    (org_a, user_a), (org_b, _) = two_orgs
    with tenant_conn(org_a, user_a) as conn:
        rows = conn.execute("SELECT org_id FROM facts").fetchall()
    assert rows and all(r["org_id"] == org_a for r in rows)


def test_no_tenant_context_sees_nothing(two_orgs):
    with tenant_conn() as conn:
        assert conn.execute("SELECT count(*) AS n FROM facts").fetchone()["n"] == 0


def test_cannot_write_into_another_org(two_orgs):
    (org_a, user_a), (org_b, _) = two_orgs
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        with tenant_conn(org_a, user_a) as conn:
            conn.execute("INSERT INTO facts (org_id, key, label, category) VALUES (%s,'x','X','other')", (org_b,))


def test_cannot_update_other_orgs_rows(two_orgs):
    (org_a, user_a), (org_b, _) = two_orgs
    with tenant_conn(org_a, user_a) as conn:
        n = conn.execute("UPDATE facts SET label = 'hacked' WHERE org_id = %s", (org_b,)).rowcount
    assert n == 0


def test_audit_log_is_append_only(two_orgs):
    (org_a, user_a), _ = two_orgs
    with tenant_conn(org_a, user_a) as conn:
        write_audit(conn, user_a, "test.event", "test")
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        with tenant_conn(org_a, user_a) as conn:
            conn.execute("UPDATE audit_log SET action = 'edited'")
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        with tenant_conn(org_a, user_a) as conn:
            conn.execute("DELETE FROM audit_log")


def _new_fact_version(conn, org_id, user_id, status="draft", approved_by=None):
    fact_id = conn.execute("SELECT id FROM facts WHERE org_id = %s LIMIT 1", (org_id,)).fetchone()["id"]
    vno = conn.execute("SELECT coalesce(max(version_no),0)+1 AS n FROM fact_versions WHERE fact_id = %s", (fact_id,)).fetchone()["n"]
    return conn.execute(
        """INSERT INTO fact_versions (org_id, fact_id, version_no, value_text, valid_from, status, proposed_by, approved_by)
           VALUES (%s,%s,%s,'v','2026-01-01',%s,%s,%s) RETURNING id""",
        (org_id, fact_id, vno, status, user_id, approved_by)).fetchone()["id"]


def test_separation_of_duties_enforced(two_orgs):
    (org_a, user_a), _ = two_orgs
    with pytest.raises(psycopg.errors.CheckViolation):
        with tenant_conn(org_a, user_a) as conn:
            _new_fact_version(conn, org_a, user_a, status="approved", approved_by=user_a)


def test_approved_fact_version_is_immutable(two_orgs):
    (org_a, user_a), _ = two_orgs
    other = uuid.uuid4()
    with tenant_conn(org_a, user_a) as conn:
        conn.execute("INSERT INTO users (id, email, display_name, password_hash) VALUES (%s,%s,'A','x')", (other, f"{other.hex}@t.example"))
        vid = _new_fact_version(conn, org_a, user_a, status="approved", approved_by=other)
    with pytest.raises(psycopg.errors.IntegrityConstraintViolation):
        with tenant_conn(org_a, user_a) as conn:
            conn.execute("UPDATE fact_versions SET value_text = 'changed' WHERE id = %s", (vid,))


def test_draft_fact_version_can_be_edited(two_orgs):
    (org_a, user_a), _ = two_orgs
    with tenant_conn(org_a, user_a) as conn:
        vid = _new_fact_version(conn, org_a, user_a)
        assert conn.execute("UPDATE fact_versions SET value_text = 'edited' WHERE id = %s", (vid,)).rowcount == 1


def test_content_versions_are_immutable(two_orgs):
    (org_a, user_a), _ = two_orgs
    with tenant_conn(org_a, user_a) as conn:
        item = conn.execute("INSERT INTO content_items (org_id, title, channel) VALUES (%s,'t','web') RETURNING id", (org_a,)).fetchone()["id"]
        conn.execute("INSERT INTO content_versions (org_id, content_item_id, version_no, body_text, content_hash) VALUES (%s,%s,1,'x','h')", (org_a, item))
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        with tenant_conn(org_a, user_a) as conn:
            conn.execute("UPDATE content_versions SET body_text = 'y'")


def test_dismiss_requires_reason(two_orgs):
    (org_a, user_a), _ = two_orgs
    with tenant_conn(org_a, user_a) as conn:
        item = conn.execute("INSERT INTO content_items (org_id, title, channel) VALUES (%s,'t','web') RETURNING id", (org_a,)).fetchone()["id"]
        cv = conn.execute("INSERT INTO content_versions (org_id, content_item_id, version_no, body_text, content_hash) VALUES (%s,%s,1,'x','h') RETURNING id", (org_a, item)).fetchone()["id"]
        run = conn.execute("INSERT INTO analysis_runs (org_id, content_version_id, kind) VALUES (%s,%s,'review') RETURNING id", (org_a, cv)).fetchone()["id"]
        f = conn.execute("INSERT INTO findings (org_id, analysis_run_id, content_version_id, finding_type, source_kind, issue, severity, confidence) VALUES (%s,%s,%s,'possible','persona','i','low','low') RETURNING id", (org_a, run, cv)).fetchone()["id"]
    with pytest.raises(psycopg.errors.CheckViolation):
        with tenant_conn(org_a, user_a) as conn:
            conn.execute("INSERT INTO decisions (org_id, finding_id, decided_by, action) VALUES (%s,%s,%s,'dismiss')", (org_a, f, user_a))


def test_graph_tenant_isolation_and_cross_tenant_edges(two_orgs):
    (org_a, user_a), (org_b, user_b) = two_orgs
    with tenant_conn(org_a, user_a) as conn:
        node_a = conn.execute("INSERT INTO graph_nodes (org_id,node_type,ref_id,label) VALUES (%s,'fact','a','A') RETURNING id", (org_a,)).fetchone()['id']
    with tenant_conn(org_b, user_b) as conn:
        node_b = conn.execute("INSERT INTO graph_nodes (org_id,node_type,ref_id,label) VALUES (%s,'fact','b','B') RETURNING id", (org_b,)).fetchone()['id']
    with tenant_conn(org_a, user_a) as conn:
        assert [r['id'] for r in conn.execute('SELECT id FROM graph_nodes').fetchall()] == [node_a]
    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        with tenant_conn(org_a, user_a) as conn:
            conn.execute("INSERT INTO graph_edges (org_id,src_id,dst_id,edge_type,match_method) VALUES (%s,%s,%s,'supports','link')", (org_a, node_a, node_b))


def test_graph_rebuild_is_idempotent_and_isolated(two_orgs):
    from app.api.graph import rebuild_graph
    (org_a, user_a), (org_b, user_b) = two_orgs
    with tenant_conn(org_a, user_a) as conn:
        fact = conn.execute("SELECT id FROM facts WHERE org_id=%s", (org_a,)).fetchone()['id']
        version = conn.execute("""INSERT INTO fact_versions
            (org_id,fact_id,version_no,value_text,value_number,valid_from,status,proposed_by)
            VALUES (%s,%s,1,'65,000 customers',65000,'2026-01-01','approved',%s) RETURNING id""", (org_a, fact, user_a)).fetchone()['id']
        conn.execute("UPDATE facts SET key='customer_count', current_version_id=%s WHERE id=%s", (version, fact))
        item = conn.execute("INSERT INTO content_items (org_id,title,channel) VALUES (%s,'Homepage','web') RETURNING id", (org_a,)).fetchone()['id']
        cv = conn.execute("INSERT INTO content_versions (org_id,content_item_id,version_no,body_text,content_hash) VALUES (%s,%s,1,'65,000 customers','h') RETURNING id", (org_a, item)).fetchone()['id']
        conn.execute('UPDATE content_items SET current_version_id=%s WHERE id=%s', (cv, item))
        first = rebuild_graph(conn, org_a)
        ids = {r['id'] for r in conn.execute('SELECT id FROM graph_nodes').fetchall()}
        second = rebuild_graph(conn, org_a)
        assert first == second
        assert ids == {r['id'] for r in conn.execute('SELECT id FROM graph_nodes').fetchall()}
        assert conn.execute('SELECT count(*) AS n FROM graph_edges').fetchone()['n'] == first['edges']
    with tenant_conn(org_b, user_b) as conn:
        assert conn.execute('SELECT count(*) AS n FROM graph_nodes').fetchone()['n'] == 0
        assert conn.execute('SELECT count(*) AS n FROM graph_edges').fetchone()['n'] == 0


def test_grounded_redteam_cache_and_drop_isolation(two_orgs, monkeypatch):
    from app.api import redteam
    from app.core.rbac import Principal
    (org_a, user_a), (org_b, user_b) = two_orgs
    with tenant_conn(org_a, user_a) as conn:
        item = conn.execute("INSERT INTO content_items (org_id,title,channel) VALUES (%s,'Review','web') RETURNING id", (org_a,)).fetchone()['id']
        version = conn.execute("INSERT INTO content_versions (org_id,content_item_id,version_no,body_text,content_hash) VALUES (%s,%s,1,'We are better than competitors.','h') RETURNING id", (org_a,item)).fetchone()['id']
        conn.execute('UPDATE content_items SET current_version_id=%s WHERE id=%s', (version,item))
    monkeypatch.setattr(redteam, '_has_llm', lambda: False)
    principal = Principal(str(user_a), str(org_a), 'admin')
    first = redteam.run_redteam(str(item), n=3, principal=principal)
    assert first['findings'] and all(f['finding_type'] == 'possible' and f['citations'] for f in first['findings'])
    assert not first['cached']
    second = redteam.run_redteam(str(item), n=3, principal=principal)
    assert second['cached'] and second['run_id'] == first['run_id']
    with tenant_conn(org_b, user_b) as conn:
        assert conn.execute('SELECT count(*) AS n FROM redteam_drops WHERE analysis_run_id=%s', (first['run_id'],)).fetchone()['n'] == 0
        assert conn.execute('SELECT count(*) AS n FROM findings WHERE analysis_run_id=%s', (first['run_id'],)).fetchone()['n'] == 0


def test_checker_chaos_run_persists_for_current_tenant(two_orgs):
    from app.api.chaos import checker_chaos
    from app.core.rbac import Principal
    (org_a, user_a), (org_b, user_b) = two_orgs
    with tenant_conn(org_a, user_a) as conn:
        rule = conn.execute("INSERT INTO rules (org_id,key,label,category,severity) VALUES (%s,'R-04','Product name','terminology','high') RETURNING id", (org_a,)).fetchone()['id']
        version = conn.execute("""INSERT INTO rule_versions (org_id,rule_id,version_no,description,status,proposed_by)
            VALUES (%s,%s,1,'The product name is NimbusDesk. Never write Nimbus Desk, NimbusDESK or Nimbus.','approved',%s) RETURNING id""", (org_a,rule,user_a)).fetchone()['id']
        conn.execute('UPDATE rules SET current_version_id=%s WHERE id=%s', (version,rule))
    result = checker_chaos(rule, principal=Principal(str(user_a), str(org_a), 'admin'))
    assert result['checker_misses'] == 0
    assert result['regression']['previous_run_id'] is None
    second = checker_chaos(rule, principal=Principal(str(user_a), str(org_a), 'admin'))
    assert second['regression']['previous_run_id'] == result['run_id']
    assert second['regression']['diff']['unchanged'] == len(result['cases'])
    from app.api.chaos import get_chaos_run
    saved = get_chaos_run(uuid.UUID(second['run_id']), principal=Principal(str(user_a), str(org_a), 'admin'))
    assert saved['regression'] == second['regression']
    with tenant_conn(org_a, user_a) as conn:
        assert conn.execute('SELECT count(*) AS n FROM chaos_cases WHERE chaos_run_id=%s', (result['run_id'],)).fetchone()['n'] == len(result['cases'])
    with tenant_conn(org_b, user_b) as conn:
        assert conn.execute('SELECT count(*) AS n FROM chaos_cases WHERE chaos_run_id=%s', (result['run_id'],)).fetchone()['n'] == 0


def test_graph_vectors_require_matching_provenance_and_tenant(two_orgs, monkeypatch):
    """Synthetic vectors exercise SQL isolation, not embedding quality."""
    from app.api.graph import rebuild_graph
    (org_a, user_a), (org_b, user_b) = two_orgs
    monkeypatch.setenv('GRAPH_VECTOR_MATCH_ENABLED', 'true')
    vector = '[' + ','.join(['1'] + ['0'] * 1535) + ']'
    with tenant_conn(org_a, user_a) as conn:
        fact = conn.execute('SELECT id FROM facts WHERE org_id=%s', (org_a,)).fetchone()['id']
        version = conn.execute("""INSERT INTO fact_versions
            (org_id,fact_id,version_no,value_text,value_number,valid_from,status,proposed_by,embedding,embedding_model,embedding_input)
            VALUES (%s,%s,1,'65,000 customers',65000,'2026-01-01','approved',%s,%s::vector,'fixture-v1',%s) RETURNING id""",
            (org_a, fact, user_a, vector, 'Fact\n65,000 customers')).fetchone()['id']
        conn.execute('UPDATE facts SET current_version_id=%s WHERE id=%s', (version, fact))
        item = conn.execute("INSERT INTO content_items (org_id,title,channel) VALUES (%s,'Draft','web') RETURNING id", (org_a,)).fetchone()['id']
        cv = conn.execute("""INSERT INTO content_versions (org_id,content_item_id,version_no,body_text,content_hash)
            VALUES (%s,%s,1,'50,000 tickets','h') RETURNING id""", (org_a,item)).fetchone()['id']
        conn.execute('UPDATE content_items SET current_version_id=%s WHERE id=%s', (cv,item))
        claim = conn.execute("""INSERT INTO content_claims (org_id,content_version_id,span_start,span_end,raw_text,
            embedding,embedding_model,embedding_input) VALUES (%s,%s,0,14,'50,000 tickets',%s::vector,'fixture-v1','50,000 tickets') RETURNING id""", (org_a,cv,vector)).fetchone()['id']
        rebuild_graph(conn, org_a)
        assert conn.execute("SELECT count(*) AS n FROM graph_edges WHERE org_id=%s AND match_method='embedding' AND evidence->>'match_type'='possible'", (org_a,)).fetchone()['n'] == 1
        conn.execute("UPDATE content_claims SET embedding_model='different-model' WHERE id=%s", (claim,))
        rebuild_graph(conn, org_a)
        assert conn.execute("SELECT count(*) AS n FROM graph_edges WHERE org_id=%s AND match_method='embedding'", (org_a,)).fetchone()['n'] == 0
        conn.execute("UPDATE content_claims SET embedding_model='fixture-v1', embedding_input='stale input' WHERE id=%s", (claim,))
        rebuild_graph(conn, org_a)
        assert conn.execute("SELECT count(*) AS n FROM graph_edges WHERE org_id=%s AND match_method='embedding'", (org_a,)).fetchone()['n'] == 0
    with tenant_conn(org_b, user_b) as conn:
        assert conn.execute("SELECT count(*) AS n FROM graph_edges WHERE match_method='embedding'").fetchone()['n'] == 0


def test_historical_blast_vector_provenance_and_tenant(two_orgs, monkeypatch):
    from app.api.blast_radius import _historical_vector_candidates
    (org_a, user_a), (org_b, user_b) = two_orgs
    monkeypatch.setenv('GRAPH_VECTOR_MATCH_ENABLED', 'true')
    vector = '[' + ','.join(['1'] + ['0'] * 1535) + ']'
    with tenant_conn(org_a, user_a) as conn:
        fact = conn.execute('SELECT id, label FROM facts WHERE org_id=%s', (org_a,)).fetchone()
        old = conn.execute("""INSERT INTO fact_versions
            (org_id,fact_id,version_no,value_text,valid_from,status,proposed_by,embedding,embedding_model,embedding_input)
            VALUES (%s,%s,1,'Old value','2026-01-01','superseded',%s,%s::vector,'fixture-v1',%s) RETURNING id""",
            (org_a, fact['id'], user_a, vector, fact['label']+'\nOld value')).fetchone()['id']
        item = conn.execute("INSERT INTO content_items (org_id,title,channel) VALUES (%s,'Draft','web') RETURNING id", (org_a,)).fetchone()['id']
        cv = conn.execute("INSERT INTO content_versions (org_id,content_item_id,version_no,body_text,content_hash) VALUES (%s,%s,1,'Related claim','hash') RETURNING id", (org_a,item)).fetchone()['id']
        conn.execute('UPDATE content_items SET current_version_id=%s WHERE id=%s', (cv,item))
        claim = conn.execute("""INSERT INTO content_claims (org_id,content_version_id,span_start,span_end,raw_text,embedding,embedding_model,embedding_input)
            VALUES (%s,%s,0,13,'Related claim',%s::vector,'fixture-v1','Related claim') RETURNING id""", (org_a,cv,vector)).fetchone()['id']
        found = _historical_vector_candidates(conn, org_a, fact['id'], old)
        assert found[str(cv)]['match_type'] == 'possible'
        conn.execute("UPDATE content_claims SET embedding_model='other' WHERE id=%s", (claim,))
        assert not _historical_vector_candidates(conn, org_a, fact['id'], old)
        conn.execute("UPDATE content_claims SET embedding_model='fixture-v1', embedding_input='stale' WHERE id=%s", (claim,))
        assert not _historical_vector_candidates(conn, org_a, fact['id'], old)
    with tenant_conn(org_b, user_b) as conn:
        assert not _historical_vector_candidates(conn, org_b, fact['id'], old)


def test_human_review_cases_persist_and_remain_tenant_scoped(two_orgs):
    from app.api.chaos import create_review_cases, get_chaos_run, label_case, LabelBody, list_review_cases, compare_review_runs, CompareReviewBody, get_review_comparison, ReviewCasesBody
    from app.core.rbac import Principal
    from app.core.errors import ApiError
    (org_a, user_a), (org_b, user_b) = two_orgs
    with tenant_conn(org_a, user_a) as conn:
        rule = conn.execute("INSERT INTO rules (org_id,key,label,category,severity) VALUES (%s,'review-test','Review','claims','high') RETURNING id", (org_a,)).fetchone()['id']
        ver = conn.execute("""INSERT INTO rule_versions (org_id,rule_id,version_no,description,status,proposed_by)
            VALUES (%s,%s,1,'An example rule','approved',%s) RETURNING id""", (org_a, rule, user_a)).fetchone()['id']
        conn.execute('UPDATE rules SET current_version_id=%s WHERE id=%s', (ver,rule))
        conn.execute("INSERT INTO rule_examples (org_id,rule_version_id,kind,text) VALUES (%s,%s,'bad','Example text')", (org_a,ver))
    principal_a, principal_b = Principal(user_a, org_a, 'admin'), Principal(user_b, org_b, 'admin')
    result = create_review_cases(rule, principal=principal_a)
    assert len(result['cases']) >= 1
    case_id = uuid.UUID(result['cases'][0]['id'])
    label_case(case_id, LabelBody(human_label='fail'), principal=principal_a)
    saved = get_chaos_run(uuid.UUID(result['run_id']), principal=principal_a)
    assert next(c for c in saved['cases'] if str(c['id']) == str(case_id))['human_label'] == 'fail'
    assert saved['run']['mode'] == 'human_review'
    assert list_review_cases(rule, principal=principal_a)['runs'][0]['run_id'] == result['run_id']
    custom = create_review_cases(rule, ReviewCasesBody(reviewer_examples=['User case']), principal=principal_a)
    assert any(c['text'] == 'User case' and c['axis'] == 'reviewer_input' for c in custom['cases'])
    with tenant_conn(org_a, user_a) as conn:
        assert conn.execute('SELECT count(*) AS n FROM rule_examples WHERE rule_version_id=%s', (ver,)).fetchone()['n'] == 1
    second = create_review_cases(rule, principal=principal_a)
    snapshot = compare_review_runs(rule, CompareReviewBody(previous_run_id=result['run_id'], current_run_id=second['run_id']), principal=principal_a)
    label_case(uuid.UUID(second['cases'][0]['id']), LabelBody(human_label='pass'), principal=principal_a)
    assert get_review_comparison(uuid.UUID(snapshot['comparison_id']), principal=principal_a) == snapshot
    with pytest.raises(ApiError):
        get_review_comparison(uuid.UUID(snapshot['comparison_id']), principal=principal_b)
    with pytest.raises(ApiError):
        compare_review_runs(rule, CompareReviewBody(previous_run_id=result['run_id'], current_run_id=second['run_id']), principal=principal_b)
    with pytest.raises(ApiError):
        list_review_cases(rule, principal=principal_b)
    with pytest.raises(ApiError):
        get_chaos_run(uuid.UUID(result['run_id']), principal=principal_b)
    with pytest.raises(ApiError):
        label_case(case_id, LabelBody(human_label='pass'), principal=principal_b)


def test_graph_fact_paths_are_scoped_to_tenant_and_snapshot(two_orgs):
    from app.api.graph import rebuild_graph, fact_paths
    from app.core.rbac import Principal
    from app.core.errors import ApiError
    (org_a, user_a), (org_b, user_b) = two_orgs
    with tenant_conn(org_a, user_a) as conn:
        fact = conn.execute('SELECT id FROM facts WHERE org_id=%s', (org_a,)).fetchone()['id']
        version = conn.execute("""INSERT INTO fact_versions
            (org_id,fact_id,version_no,value_text,value_number,valid_from,status,proposed_by)
            VALUES (%s,%s,1,'50,000 customers',50000,'2026-01-01','approved',%s) RETURNING id""", (org_a, fact, user_a)).fetchone()['id']
        conn.execute('UPDATE facts SET current_version_id=%s WHERE id=%s', (version, fact))
        item = conn.execute("INSERT INTO content_items (org_id,title,channel) VALUES (%s,'Draft','web') RETURNING id", (org_a,)).fetchone()['id']
        cv = conn.execute("INSERT INTO content_versions (org_id,content_item_id,version_no,body_text,content_hash) VALUES (%s,%s,1,'50,000 tickets','hash') RETURNING id", (org_a,item)).fetchone()['id']
        conn.execute('UPDATE content_items SET current_version_id=%s WHERE id=%s', (cv,item))
        rebuild_graph(conn, org_a)
    result = fact_paths(fact, principal=Principal(user_a, org_a, 'admin'))
    assert len(result['paths']) == 1 and result['paths'][0]['match_type'] == 'possible'
    assert result['paths'][0]['channels'] == ['web']
    with pytest.raises(ApiError):
        fact_paths(fact, principal=Principal(user_b, org_b, 'admin'))
