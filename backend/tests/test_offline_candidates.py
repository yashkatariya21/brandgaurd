from app.services.offline_candidates import offline_candidate


def test_offline_synonyms_return_exact_possible_passage():
    text = 'Intro. Our client information is stored in Europe. Next.'
    result = offline_candidate(text, 'customer data stored in European Union', 'customer data stored in Canada')
    assert result is not None
    assert result['match_type'] == 'possible'
    assert result['match_method'] == 'offline_lexical'
    assert text[result['span_start']:result['span_end']] == result['stale_text']


def test_new_value_and_numeric_near_misses_do_not_match():
    assert offline_candidate('Client information is stored in Canada.',
        'customer data stored in European Union', 'customer data stored in Canada') is None
    assert offline_candidate('Our 50,001 customers use this.', '50,000 customers', '65,000 customers') is None


def test_same_values_and_generic_single_words_do_not_match():
    assert offline_candidate('Customer data stored in Europe.', 'customer data stored in Europe', 'client information stored in Europe') is None
    assert offline_candidate('We use storage.', 'storage', 'other') is None


def test_search_is_bounded_and_never_invents_source_text():
    assert offline_candidate('x' * 100_001 + '\nclient information stored in Europe.',
        'customer data stored in Europe', 'customer data stored in Canada') is None
