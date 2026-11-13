from app.seed_data import RULES
from app.services.rulebook import contradictions


def test_seed_rule_conflicts_are_possible_and_have_evidence():
    rules = [dict(key=r[0], applies_to=r[3], description=r[5]) for r in RULES]
    issues = contradictions(rules)
    pairs = {(i['rule_a'], i['rule_b']) for i in issues}
    assert ('R-02', 'R-03') in pairs
    assert ('R-03', 'R-15') in pairs
    for issue in issues:
        assert issue['type'] == 'possible'
        assert issue['quote_a'] and issue['quote_b'] and issue['scenario'] and issue['channels']


def test_disjoint_channels_do_not_conflict():
    rules = [dict(key='a', applies_to=['web'], description='Use contractions.'),
             dict(key='b', applies_to=['email'], description='Use formal language.')]
    assert contradictions(rules) == []


def test_coverage_flags_present_claim_type_without_governing_rule():
    from app.services.rulebook import coverage_report
    rules = [{'key': 'R7', 'category': 'claims', 'description': 'Statistics match facts.', 'applies_to': ['web'], 'test_count': 1}]
    content = [{'id':'c1', 'title':'Pricing', 'channel':'web', 'body_text':'Plans start at $19.'}]
    result = coverage_report(rules, content)
    assert result['matrix'][0]['claim_types']['numeric'] == 1
    assert result['matrix'][0]['claim_types']['price'] == 0
    assert any(g['kind'] == 'claim_type' and g['subject'] == 'price' and g['evidence'] == '$19' for g in result['gaps'])


def test_coverage_reports_seed_unclear_and_untested_rules():
    from app.services.rulebook import coverage_report
    rules = [dict(key=r[0], category=r[2], applies_to=r[3], description=r[5], expected_behaviour=r[6]) for r in RULES]
    gaps = coverage_report(rules, [])['gaps']
    assert {'R-09', 'R-14', 'R-15'} <= {g['subject'] for g in gaps if g['kind'] == 'unclear_threshold'}
    assert any(g['kind'] == 'untested_rule' for g in gaps)


def test_contradictions_respect_directive_polarity_and_scope():
    def rule(key, text, channel='web'):
        return {'key': key, 'description': text, 'applies_to': [channel]}
    formal = rule('formal', 'Maintain a formal tone.')
    assert not contradictions([formal, rule('no_contractions', 'Do not use contractions.')])
    assert not contradictions([formal, rule('no_emoji', 'Avoid emoji.')])
    assert not contradictions([rule('a', 'Use contractions.'), rule('b', 'Use contractions.')])
    conflict = contradictions([rule('a', 'Use contractions.'), rule('b', 'Never use contractions.')])
    assert len(conflict) == 1 and conflict[0]['channels'] == ['web']
    assert conflict[0]['type'] == 'possible' and conflict[0]['quote_b'] == 'Never use contractions.'
    assert not contradictions([rule('a', 'Use contractions.'), rule('b', 'Never use contractions.', 'social')])


def test_unknown_and_conflicting_directive_in_one_clause_do_not_create_candidates():
    rules = [{'key': 'a', 'description': 'Consider contractions.', 'applies_to': ['web']},
             {'key': 'b', 'description': 'Maintain a formal tone.', 'applies_to': ['web']}]
    assert not contradictions(rules)
    rules[0]['description'] = 'Use contractions. Do not use contractions.'
    assert not contradictions(rules)
