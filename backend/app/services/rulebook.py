"""Conservative, explainable candidates; a human must resolve each one."""
from itertools import combinations

EXTERNAL_CHANNELS = {'web', 'social', 'email', 'press', 'pdf', 'image'}


def expanded_channels(rule):
    channels = set(rule.get('applies_to') or [])
    if 'all' in channels or 'external' in channels:
        channels |= EXTERNAL_CHANNELS
    return channels - {'all', 'external'}


def contradictions(rules):
    results = []
    for a, b in combinations(rules, 2):
        shared = sorted(expanded_channels(a) & expanded_channels(b))
        if not shared:
            continue
        ta, tb = (a.get('description') or '').lower(), (b.get('description') or '').lower()
        text = ta + ' ' + tb
        scenario = None
        if 'formal' in text and 'contraction' in text:
            scenario = "We're pleased to announce our new office."
        elif 'formal' in text and 'emoji' in text:
            scenario = 'We are pleased to announce our new office. 🎉'
        if scenario:
            results.append({'rule_a': a['key'], 'rule_b': b['key'],
                            'quote_a': a['description'], 'quote_b': b['description'],
                            'channels': shared, 'scenario': scenario, 'type': 'possible',
                            'explanation': 'Potential tension; the directives may be compatible in context. A human must decide.'})
    return results
