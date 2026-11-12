"""Rebuild and inspect the dependency graph for the current organisation."""
import os

from fastapi import APIRouter, Depends
from psycopg.types.json import Jsonb

from ..core.db import tenant_conn
from ..core.rbac import Principal, require
from ..services.dependency_graph import graph_projection

router = APIRouter(prefix='/v1')


def rebuild_graph(conn, org_id):
    # Serialise rebuilds for this tenant within the current transaction.
    conn.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))", (str(org_id),))
    facts = conn.execute("""SELECT f.id, f.key, f.label, v.value_text, v.value_number, v.version_no
        FROM facts f JOIN fact_versions v ON v.id=f.current_version_id
        WHERE f.org_id=%s AND v.org_id=%s AND v.status='approved' ORDER BY f.key""", (org_id, org_id)).fetchall()
    items = conn.execute("""SELECT c.id, c.title, c.channel, c.status, c.registered_state,
        v.id AS version_id, v.body_text FROM content_items c JOIN content_versions v ON v.id=c.current_version_id
        WHERE c.org_id=%s AND v.org_id=%s ORDER BY c.id""", (org_id, org_id)).fetchall()
    links = conn.execute("""SELECT content_version_id, span_start, span_end, fact_id FROM content_claims
        WHERE org_id=%s AND link_status='confirmed' AND fact_id IS NOT NULL""", (org_id,)).fetchall()
    vector_matches = []
    if os.environ.get('GRAPH_VECTOR_MATCH_ENABLED', '').lower() == 'true':
        # Strict exact-input and same-model checks prevent unlabelled, stale or
        # incompatible vectors from being compared. Top three are candidates only.
        vector_matches = conn.execute("""SELECT cc.content_version_id, cc.span_start, cc.span_end,
                cc.raw_text, neighbours.fact_id, neighbours.score, cc.embedding_model AS model
            FROM content_claims cc
            JOIN content_versions cv ON cv.id=cc.content_version_id AND cv.org_id=cc.org_id
            JOIN content_items ci ON ci.id=cv.content_item_id AND ci.org_id=cc.org_id AND ci.current_version_id=cv.id
            CROSS JOIN LATERAL (
                SELECT f.id AS fact_id, 1 - (fv.embedding <=> cc.embedding) AS score
                FROM facts f JOIN fact_versions fv ON fv.id=f.current_version_id AND fv.org_id=f.org_id
                WHERE f.org_id=cc.org_id AND fv.status='approved' AND fv.embedding IS NOT NULL
                  AND fv.embedding_model=cc.embedding_model AND fv.embedding_model <> ''
                  AND fv.embedding_input=f.label || chr(10) || fv.value_text
                  AND 1 - (fv.embedding <=> cc.embedding) >= 0.85
                ORDER BY fv.embedding <=> cc.embedding, f.id LIMIT 3
            ) neighbours
            WHERE cc.org_id=%s AND cc.embedding IS NOT NULL AND cc.embedding_model IS NOT NULL
              AND cc.embedding_model <> '' AND cc.embedding_input=cc.raw_text
              AND cc.span_start >= 0 AND cc.span_end > cc.span_start
              AND substring(cv.body_text FROM cc.span_start + 1 FOR cc.span_end - cc.span_start) = cc.raw_text
            ORDER BY cc.id, neighbours.fact_id""", (org_id,)).fetchall()
    nodes, edges = graph_projection([dict(x) for x in facts], [dict(x) for x in items],
                                    [dict(x) for x in links], [dict(x) for x in vector_matches])
    ids = {}
    for n in nodes:
        row = conn.execute("""INSERT INTO graph_nodes (org_id,node_type,ref_id,label,meta)
            VALUES (%s,%s,%s,%s,%s) ON CONFLICT (org_id,node_type,ref_id)
            DO UPDATE SET label=EXCLUDED.label, meta=EXCLUDED.meta RETURNING id""",
            (org_id, n['type'], n['ref'], n['label'], Jsonb(n['meta']))).fetchone()
        ids[(n['type'], n['ref'])] = row['id']
    # Delete old edges before removing obsolete nodes; transaction keeps reads consistent.
    conn.execute('DELETE FROM graph_edges WHERE org_id=%s', (org_id,))
    if ids:
        conn.execute('DELETE FROM graph_nodes WHERE org_id=%s AND NOT (id = ANY(%s::uuid[]))', (org_id, list(ids.values())))
    else:
        conn.execute('DELETE FROM graph_nodes WHERE org_id=%s', (org_id,))
    for e in edges:
        conn.execute("""INSERT INTO graph_edges (org_id,src_id,dst_id,edge_type,match_method,score,evidence)
            VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (org_id,src_id,dst_id,edge_type,match_method)
            DO UPDATE SET score=EXCLUDED.score,evidence=EXCLUDED.evidence""",
            (org_id, ids[e['src']], ids[e['dst']], e['type'], e['method'], e['score'], Jsonb(e['evidence'])))
    return {'nodes': len(nodes), 'edges': len(edges)}


@router.post('/graph/rebuild')
def rebuild(principal: Principal = Depends(require('view_repository'))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        return rebuild_graph(conn, principal.org_id)


@router.get('/graph')
def get_graph(principal: Principal = Depends(require('view_repository'))):
    with tenant_conn(principal.org_id, principal.user_id) as conn:
        nodes = conn.execute('SELECT id,node_type,ref_id,label,meta FROM graph_nodes WHERE org_id=%s ORDER BY node_type,label,id', (principal.org_id,)).fetchall()
        edges = conn.execute('SELECT id,src_id,dst_id,edge_type,match_method,score,evidence FROM graph_edges WHERE org_id=%s ORDER BY id', (principal.org_id,)).fetchall()
    return {'nodes': [{**dict(n), 'id': str(n['id'])} for n in nodes],
            'edges': [{**dict(e), 'id': str(e['id']), 'src_id': str(e['src_id']), 'dst_id': str(e['dst_id']), 'score': float(e['score']) if e['score'] is not None else None} for e in edges],
            'scope_note': 'Only content registered in BrandGuard is included. Channel assignment is not proof of publication. Nothing changes automatically.',
            'limitations': ('Local similarity is experimental and not calibrated. '
                         'If enabled, only provenance-labelled matching-model embeddings with unchanged inputs are compared; '
                         'the vector threshold is experimental and all vector matches are possible, not confirmed. '
                         'Embeddings are not generated by this service.')}
