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
