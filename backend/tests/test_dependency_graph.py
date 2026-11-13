from app.services.dependency_graph import graph_projection, match_claim, local_similarity


def fact():
    return {'id': 'f1', 'key': 'customer_count', 'label': 'Customer count', 'value_text': '65,000+ customers', 'value_number': 65000, 'version_no': 2}


def test_classification_never_promotes_semantic_match():
    f = fact()
    assert match_claim(f, {'raw_text': '65,000 customers', 'value_number': 65000, 'attribute': 'customer_count'})['match_type'] == 'confirmed'
    assert match_claim(f, {'raw_text': '65,000 tickets', 'value_number': 65000, 'attribute': 'ticket_volume'})['match_type'] == 'possible'
    m = match_claim(f, {'raw_text': '65000 customer', 'value_number': None, 'attribute': None})
    assert m and m['method'] == 'local-similarity' and m['match_type'] == 'possible'
    assert match_claim(f, {'raw_text': 'anything', 'value_number': None}, explicit_link=True)['method'] == 'link'


def test_local_similarity_handles_spelled_numbers():
    assert local_similarity('65,000 customers', 'sixty-five thousand teams') > .9


def test_projection_empty_and_registered_content():
    assert graph_projection([], [], []) == ([], [])
    item = {'id': 'c1', 'title': 'Homepage', 'channel': 'web', 'status': 'draft', 'registered_state': 'none', 'version_id': 'v1', 'body_text': 'Over 65,000 customers trust us.'}
    nodes, edges = graph_projection([fact()], [item], [])
    assert {n['type'] for n in nodes} == {'fact', 'claim', 'content', 'channel'}
    support = [e for e in edges if e['type'] == 'supports']
    assert len(support) == 1 and support[0]['evidence']['match_type'] == 'confirmed'
    assert graph_projection([fact()], [item], []) == (nodes, edges)


def test_vector_candidates_are_possible_and_bound_to_exact_span_and_text():
    item = {'id':'c1', 'title':'Draft', 'channel':'web', 'status':'draft', 'registered_state':'none',
            'version_id':'v1', 'body_text':'We handle 50,000 tickets.'}
    f = fact()
    row = {'content_version_id':'v1', 'span_start':10, 'span_end':24,
           'raw_text':'50,000 tickets', 'fact_id':'f1', 'score':.95, 'model':'test-model'}
    nodes, edges = graph_projection([f], [item], [], [row])
    matches = [e for e in edges if e['type'] == 'supports']
    assert len(matches) == 1
    assert matches[0]['method'] == 'embedding' and matches[0]['evidence']['match_type'] == 'possible'
    assert matches[0]['evidence']['model'] == 'test-model'
    _, no_match = graph_projection([f], [item], [], [{**row, 'raw_text': 'different'}])
    assert not any(e['method'] == 'embedding' for e in no_match)
    _, bad_score = graph_projection([f], [item], [], [{**row, 'score': float('nan')}])
    assert not any(e['method'] == 'embedding' for e in bad_score)


def test_vectors_cannot_override_confirmed_exact_match():
    item = {'id':'c1', 'title':'Draft', 'channel':'web', 'status':'draft', 'registered_state':'none',
            'version_id':'v1', 'body_text':'65,000 customers'}
    vector = {'content_version_id':'v1', 'span_start':0, 'span_end':16,
              'raw_text':'65,000 customers', 'fact_id':'f1', 'score':.99, 'model':'test-model'}
    _, edges = graph_projection([fact()], [item], [], [vector])
    support = [e for e in edges if e['type'] == 'supports']
    assert len(support) == 1 and support[0]['method'] == 'attribute'
    assert support[0]['evidence']['match_type'] == 'confirmed'


def test_impact_paths_follow_only_correct_edges_and_do_not_promote_similarity():
    from app.services.dependency_graph import graph_impact_paths
    nodes = [{'id':'f', 'node_type':'fact', 'ref_id':'fact1', 'label':'Customers', 'meta':{}},
             {'id':'q', 'node_type':'claim', 'ref_id':'v:0:3', 'label':'50k', 'meta':{'span_start':0,'span_end':3}},
             {'id':'c', 'node_type':'content', 'ref_id':'item', 'label':'Home', 'meta':{'registered_state':'published','status':'approved'}},
             {'id':'ch', 'node_type':'channel', 'ref_id':'web', 'label':'web', 'meta':{}}]
    edges = [{'src_id':'f','dst_id':'q','edge_type':'supports','match_method':'embedding','score':.9,'evidence':{'match_type':'confirmed'}},
             {'src_id':'q','dst_id':'c','edge_type':'extracted_from','match_method':'link','score':None,'evidence':{}},
             {'src_id':'c','dst_id':'ch','edge_type':'published_on','match_method':'link','score':None,'evidence':{}}]
    output = graph_impact_paths('fact1', nodes, edges)
    assert len(output['paths']) == 1
    path = output['paths'][0]
    assert path['match_type'] == 'possible' and path['channels'] == ['web']
    assert path['content_id'] == 'item' and path['span_start'] == 0
    assert 'do not establish' in output['limitations']
    assert graph_impact_paths('missing', nodes, edges) is None
    edges[1]['edge_type'] = 'asserts'
    assert graph_impact_paths('fact1', nodes, edges)['paths'] == []


def test_impact_paths_preserve_mixed_evidence_and_known_confirmed_methods():
    from app.services.dependency_graph import graph_impact_paths
    nodes = [{'id':'f','node_type':'fact','ref_id':'f','label':'F','meta':{}},
             {'id':'q','node_type':'claim','ref_id':'q','label':'Claim','meta':{}},
             {'id':'c','node_type':'content','ref_id':'c','label':'Draft','meta':{'status':'draft'}}]
    edges = [{'src_id':'f','dst_id':'q','edge_type':'supports','match_method':method,'score':1,'evidence':{'match_type':label}}
             for method,label in [('attribute','confirmed'),('exact','possible')]]
    edges.append({'src_id':'q','dst_id':'c','edge_type':'extracted_from','match_method':'link','score':None,'evidence':{}})
    paths = graph_impact_paths('f',nodes,edges)['paths']
    assert {p['match_type'] for p in paths} == {'confirmed','possible'}
    assert all(p['channels'] == [] for p in paths)


def test_fact_path_api_queries_only_current_tenant_and_locks_snapshot(monkeypatch):
    from contextlib import contextmanager
    from uuid import uuid4
    from app.api import graph
    from app.core.rbac import Principal
    org, user, fact_id = uuid4(), uuid4(), uuid4()
    calls = []
    class Rows:
        def __init__(self, rows): self.rows = rows
        def fetchall(self): return self.rows
    class Conn:
        def execute(self, query, args):
            calls.append(query)
            if 'advisory' in query:
                assert args == (str(org),)
                return Rows([])
            assert args == (org,)
            if 'graph_nodes' in query:
                return Rows([{'id':'n','node_type':'fact','ref_id':str(fact_id),'label':'Fact','meta':{}}])
            if 'graph_edges' in query: return Rows([])
            raise AssertionError(query)
    @contextmanager
    def tenant(*args):
        assert args == (org, user)
        yield Conn()
    monkeypatch.setattr(graph, 'tenant_conn', tenant)
    output = graph.fact_paths(fact_id, Principal(user, org, 'admin'))
    assert output['fact_id'] == str(fact_id) and output['paths'] == []
    assert 'advisory' in calls[0]
