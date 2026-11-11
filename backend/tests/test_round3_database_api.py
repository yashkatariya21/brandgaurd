"""Database-backed API journey; intended for CI's pgvector PostgreSQL service."""
import uuid
from app.core.db import tenant_conn
from app.core.security import create_token


def auth(user, org, role):
    return {'Authorization': 'Bearer ' + create_token(user, org, role)}


def test_approval_graph_refresh_and_org_isolation(client, two_orgs):
    (org, proposer), (other_org, other_user) = two_orgs
    approver = uuid.uuid4()
    with tenant_conn(org, proposer) as conn:
        conn.execute("INSERT INTO users (id,email,display_name,password_hash) VALUES (%s,%s,'Approver','x')", (approver, f'{approver.hex}@test.example'))
        conn.execute("INSERT INTO memberships (org_id,user_id,role) VALUES (%s,%s,'approver')", (org, approver))
        fact = conn.execute('SELECT id FROM facts WHERE org_id=%s', (org,)).fetchone()['id']
        conn.execute("UPDATE facts SET key='customer_count',label='Customers' WHERE id=%s", (fact,))
        conn.execute("""INSERT INTO fact_versions (org_id,fact_id,version_no,value_text,value_number,valid_from,status,proposed_by)
                      VALUES (%s,%s,1,'65,000 customers',65000,'2026-01-01','draft',%s)""", (org,fact,proposer))
        item = conn.execute("INSERT INTO content_items (org_id,title,channel) VALUES (%s,'Homepage','web') RETURNING id", (org,)).fetchone()['id']
        version = conn.execute("""INSERT INTO content_versions (org_id,content_item_id,version_no,body_text,content_hash)
                                  VALUES (%s,%s,1,'65,000 customers','h') RETURNING id""", (org,item)).fetchone()['id']
        conn.execute('UPDATE content_items SET current_version_id=%s WHERE id=%s', (version,item))
    self_approval = client.post(f'/v1/facts/{fact}/versions/1/approve', headers=auth(proposer,org,'admin'))
    assert self_approval.status_code == 409
    approved = client.post(f'/v1/facts/{fact}/versions/1/approve', headers=auth(approver,org,'approver'))
    assert approved.status_code == 200, approved.text
    graph = client.get('/v1/graph', headers=auth(approver,org,'approver'))
    assert graph.status_code == 200
    assert {n['node_type'] for n in graph.json()['nodes']} == {'fact','claim','content','channel'}
    assert any(e['edge_type']=='supports' and e['evidence']['match_type']=='confirmed' for e in graph.json()['edges'])
    other_graph = client.get('/v1/graph', headers=auth(other_user,other_org,'admin'))
    assert other_graph.status_code == 200 and other_graph.json()['nodes'] == []


def test_rejection_reason_is_stored_in_version_and_audit(client, two_orgs):
    (org, proposer), _ = two_orgs
    with tenant_conn(org, proposer) as conn:
        fact = conn.execute('SELECT id FROM facts WHERE org_id=%s', (org,)).fetchone()['id']
        version = conn.execute("""INSERT INTO fact_versions (org_id,fact_id,version_no,value_text,valid_from,status,proposed_by)
                VALUES (%s,%s,1,'a value','2026-01-01','draft',%s) RETURNING id""", (org,fact,proposer)).fetchone()['id']
    response = client.post(f'/v1/facts/{fact}/versions/1/reject', headers=auth(proposer,org,'admin'), json={'reason':'Missing source'})
    assert response.status_code == 200, response.text
    with tenant_conn(org, proposer) as conn:
        saved = conn.execute('SELECT rejection_reason FROM fact_versions WHERE id=%s', (version,)).fetchone()
        audit = conn.execute("SELECT after FROM audit_log WHERE action='fact_version.rejected' AND object_id=%s", (version,)).fetchone()
    assert saved['rejection_reason'] == 'Missing source'
    assert audit['after']['reason'] == 'Missing source'
