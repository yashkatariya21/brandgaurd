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
