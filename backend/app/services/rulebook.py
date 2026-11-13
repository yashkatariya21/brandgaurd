"""Conservative, explainable candidates; a human must resolve each one."""
from itertools import combinations
import re

EXTERNAL_CHANNELS = {'web', 'social', 'email', 'press', 'pdf', 'image'}


def expanded_channels(rule):
    channels = set(rule.get('applies_to') or [])
    if 'all' in channels or 'external' in channels:
        channels |= EXTERNAL_CHANNELS
    return channels - {'all', 'external'}


def _directive(text, subject):
    """Recognise a narrow imperative vocabulary; unknown wording stays unknown."""
    noun = {'contractions': r'contractions?', 'emoji': r'emojis?',
            'formal': r'formal(?:\s+(?:tone|language))?'}[subject]
    # Search within clauses so a negation elsewhere does not invert a directive.
    clauses = re.split(r'[.;!?]', text.lower())
    values = set()
    for clause in clauses:
        if not re.search(r'\b' + noun + r'\b', clause):
            continue
        if re.search(r"\b(?:do not|don't|never|avoid|prohibit|ban)\s+(?:use\s+)?" + noun + r'\b', clause):
            values.add('avoid')
        elif re.search(r'\b(?:use|require|maintain)\s+(?:a\s+)?' + noun + r'\b', clause):
            values.add('use')
    return next(iter(values)) if len(values) == 1 else None


def contradictions(rules):
    """Find a small set of polarity-aware candidates, not exhaustive conflicts."""
    results = []
    examples = {'contractions': "We're pleased to announce our new office.",
                'emoji': 'We are pleased to announce our new office. 🎉',
                'formal': 'We are pleased to announce our new office.'}
    for a, b in combinations(rules, 2):
        shared = sorted(expanded_channels(a) & expanded_channels(b))
        if not shared:
            continue
        ta, tb = (a.get('description') or ''), (b.get('description') or '')
        da = {subject: _directive(ta, subject) for subject in examples}
        db = {subject: _directive(tb, subject) for subject in examples}
        scenario = None
        explanation = None
        for subject in examples:
            if {da[subject], db[subject]} == {'use', 'avoid'}:
                scenario = examples[subject]
                explanation = f'Opposing directives about {subject}; a human must interpret their context.'
                break
        if not scenario:
            for subject in ('contractions', 'emoji'):
                if ((da['formal'] == 'use' and db[subject] == 'use') or
                        (db['formal'] == 'use' and da[subject] == 'use')):
                    scenario = examples[subject]
                    explanation = 'Potential tone tension; the directives may be compatible in context. A human must decide.'
                    break
        if scenario:
            results.append({'rule_a': a['key'], 'rule_b': b['key'],
                            'quote_a': ta, 'quote_b': tb,
                            'channels': shared, 'scenario': scenario, 'type': 'possible',
                            'explanation': explanation})
    return results


CLAIM_PATTERNS = {
    'numeric': r'\b\d[\d,]*(?:\.\d+)?\b',
    'superlative': r'\b(?:best|leading|number\s+one|#1|top\s+\d+)\b',
    'competitor': r'\b(?:competitors?|rivals?|better\s+than)\b',
    'price': r'(?:\$|£|€)\s*\d[\d,]*(?:\.\d+)?|\b(?:price|pricing)\b',
    'certification': r'\b(?:iso\s*27001|soc\s*2|certified|certification)\b',
}
FAMILIES = ('tone', 'terminology', 'claims', 'accessibility', 'embargo', 'other')


def _claim_types(rule):
    """Conservative keyword coverage, not proof that a rule actually enforces a claim."""
    import re
    if rule.get('category') != 'claims':
        return set()
    text = (rule.get('description') or '').lower()
    terms = {
        'numeric': r'statistic|numeric|number',
        'superlative': r'superlative|\bbest\b|\bleading\b',
        'competitor': r'competitor|comparison',
        'price': r'pric(?:e|ing)',
        'certification': r'certif|\biso\b|\bsoc\b',
    }
    return {kind for kind, pattern in terms.items() if re.search(pattern, text)}


def coverage_report(rules: list[dict], content: list[dict]) -> dict:
    """Return counts and candidate gaps for channels actually present in content."""
    import re
    channels = sorted({item['channel'] for item in content if item.get('channel')})
    matrix = []
    gaps = []
    for channel in channels:
        applicable = [r for r in rules if channel in expanded_channels(r)]
        row = {'channel': channel, 'families': {}, 'claim_types': {}}
        for family in FAMILIES:
            count = sum(r.get('category') == family for r in applicable)
            row['families'][family] = count
            if not count:
                gaps.append({'kind': 'channel_family', 'channel': channel, 'subject': family,
                             'evidence': 'Registered content exists on this channel; no rule in this family applies.'})
        for kind, pattern in CLAIM_PATTERNS.items():
            count = sum(kind in _claim_types(r) for r in applicable)
            row['claim_types'][kind] = count
            for item in (i for i in content if i.get('channel') == channel):
                match = re.search(pattern, item.get('body_text') or '', re.IGNORECASE)
                if match and not count:
                    gaps.append({'kind': 'claim_type', 'channel': channel, 'subject': kind,
                                 'evidence': match.group(), 'content_id': str(item['id']), 'title': item['title']})
                    break
        matrix.append(row)
    for r in rules:
        if not r.get('test_count', 0):
            gaps.append({'kind': 'untested_rule', 'subject': r['key'], 'evidence': 'No saved chaos cases for this approved version.'})
        behaviour = (r.get('expected_behaviour') or '').lower()
        if 'unclear' in behaviour and not re.search(r'\d', (r.get('description') or '')):
            gaps.append({'kind': 'unclear_threshold', 'subject': r['key'], 'evidence': r.get('description') or ''})
    return {'channels': channels, 'families': list(FAMILIES), 'claim_types': list(CLAIM_PATTERNS),
            'matrix': matrix, 'gaps': gaps,
            'note': 'Coverage counts use channel scopes and keyword heuristics. Gaps are candidates for human review, not proof of compliance.'}
