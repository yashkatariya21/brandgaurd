"""Tenant-scoped dependency graph derived from registered content.

Similarity is a candidate signal only, never confirmation. Graph rebuilds do not
modify content, facts, or claim links.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from decimal import Decimal, InvalidOperation

from .claim_extractor import extract_claims

ATTRIBUTES = {
    'customer_count': 'customer_count', 'starter_price': 'price_per_agent_month',
    'pro_price': 'price_per_agent_month', 'uptime_sla': 'uptime_percent',
    'first_response': 'first_response', 'integrations': 'integrations',
    'languages': 'languages', 'free_trial': 'free_trial',
}


# Threshold is intentionally unchanged until calibration is run on development cases.
SIMILARITY_THRESHOLD = 0.70
# Score bands are based only on unreviewed synthetic development cases; not probabilities.
HIGH_SIMILARITY_THRESHOLD = 0.75
_WORD_VALUES = {'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
                'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
                'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
                'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
                'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
                'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
                'eighty': 80, 'ninety': 90}
_WORDS = '|'.join((*_WORD_VALUES, 'hundred', 'thousand', 'million', 'and'))
_WORD_PATTERN = re.compile(r'\b(?:' + _WORDS + r')(?:[\s-]+(?:' + _WORDS + r'))*\b')
_DIGITS = re.compile(r'(?<![\w.])(?:\d{1,3}(?:[ ,.]\d{3})+|\d+(?:\.\d+)?)(?:\s*(?:million|thousand|[km]))?(?!\w)')
_APPROX = re.compile(r'\b(?:nearly|almost|around|approximately|about|roughly)\b', re.I)


def _word_number(match: re.Match) -> str:
    tokens = re.findall(r'[a-z]+', match.group())
    if not tokens or tokens[0] == 'and' or tokens[-1] == 'and':
        return match.group()
    total = current = 0
    for token in tokens:
        if token == 'and':
            continue
        if token in _WORD_VALUES:
            current += _WORD_VALUES[token]
        elif token == 'hundred':
            current = (current or 1) * 100
        elif token in ('thousand', 'million'):
            total += (current or 1) * (1000 if token == 'thousand' else 1000000)
            current = 0
    return str(total + current)


def _digit_number(match: re.Match) -> str:
    raw = match.group().strip()
    scale_match = re.search(r'\s*(million|thousand|[km])$', raw)
    factor = 1
    if scale_match:
        factor = 1_000_000 if scale_match.group(1) in ('million', 'm') else 1_000
        raw = raw[:scale_match.start()]
    # A dot or comma followed by exactly three digits is treated as a grouping
    # separator, not a decimal. Other ambiguous formats remain best-effort only.
    if re.fullmatch(r'\d{1,3}(?:[ ,. ]\d{3})+', raw):
        raw = re.sub(r'[ ,. ]', '', raw)
    try:
        result = Decimal(raw) * factor
        return format(result.normalize(), 'f')
    except InvalidOperation:
        return match.group()


def _normalise(text: str) -> str:
    text = text.lower()
    text = _DIGITS.sub(_digit_number, text)
    text = _WORD_PATTERN.sub(_word_number, text)
    text = re.sub(r'\b(?:support teams?|teams?|clients?|customers?|companies|organisations?|organizations?|accounts?|brands?)\b', 'customer', text)
    return ' '.join(re.findall(r'[a-z]+|\d+(?:\.\d+)?', text))


def local_similarity(left: str, right: str) -> float:
    """Character-trigram cosine with pair-local IDF; not a probability."""
    def ngrams(text):
        text = ' ' + _normalise(text) + ' '
        return Counter(text[i:i+3] for i in range(len(text)-2))
    a, b = ngrams(left), ngrams(right)
    if not a or not b:
        return 0.0
    keys = set(a) | set(b)
    weights = {k: math.log(3 / (1 + int(k in a) + int(k in b))) + 1 for k in keys}
    dot = sum(a[k] * b[k] * weights[k] ** 2 for k in keys)
    na = math.sqrt(sum((a[k] * weights[k]) ** 2 for k in keys))
    nb = math.sqrt(sum((b[k] * weights[k]) ** 2 for k in keys))
    return dot / (na * nb) if na and nb else 0.0


def match_claim(fact: dict, claim: dict, explicit_link: bool = False) -> dict | None:
    if explicit_link:
        return {'match_type': 'confirmed', 'method': 'link', 'score': 1.0}
    number = fact.get('value_number')
    claim_number = claim.get('value_number')
    if number is not None and claim_number is not None and float(number) == float(claim_number):
        attr = ATTRIBUTES.get(fact.get('key'))
        if attr and claim.get('attribute') == attr and not claim.get('_approximate') and not _APPROX.search(claim.get('raw_text') or ''):
            return {'match_type': 'confirmed', 'method': 'attribute', 'score': 1.0}
        # Same number, different or unknown attribute is not confirmation.
        return {'match_type': 'possible', 'method': 'exact', 'score': 1.0, 'confidence_band': 'low'}
    score = local_similarity(f"{fact.get('label', '')} {fact.get('value_text', '')}", claim.get('raw_text', ''))
    if score >= SIMILARITY_THRESHOLD:
        return {'match_type': 'possible', 'method': 'local-similarity', 'score': round(score, 4),
                'confidence_band': 'high' if score >= HIGH_SIMILARITY_THRESHOLD else 'low'}
    return None


def graph_projection(facts: list[dict], items: list[dict], links: list[dict],
                     vector_matches: list[dict] | None = None) -> tuple[list[dict], list[dict]]:
    nodes, edges = [], []
    def node(kind, ref, label, meta):
        nodes.append({'type': kind, 'ref': str(ref), 'label': label, 'meta': meta})
        return (kind, str(ref))
    def edge(src, dst, kind, method='link', score=None, evidence=None):
        edges.append({'src': src, 'dst': dst, 'type': kind, 'method': method,
                      'score': score, 'evidence': evidence or {}})
    fact_nodes = [(f, node('fact', f['id'], f['label'], {'key': f['key'], 'value': f['value_text'], 'version': f['version_no']})) for f in facts]
    channels = {}
    link_set = {(str(x['content_version_id']), x['span_start'], x['span_end'], str(x['fact_id'])) for x in links}
    vectors = {}
    for row in vector_matches or []:
        score = float(row['score'])
        if not math.isfinite(score) or not 0 <= score <= 1:
            continue
        key = (str(row['content_version_id']), row['span_start'], row['span_end'], str(row['fact_id']), row['raw_text'])
        vectors[key] = {'score': score, 'model': row['model']}
    for item in items:
        content = node('content', item['id'], item['title'], {'channel': item['channel'], 'status': item['status'], 'registered_state': item['registered_state']})
        channel = item['channel']
        if channel not in channels:
            channels[channel] = node('channel', channel, channel, {})
        edge(content, channels[channel], 'published_on', evidence={'registered_state': item['registered_state'], 'note': 'Channel assignment; not proof of publication.'})
        for c in extract_claims(item.get('body_text') or ''):
            ref = f"{item['version_id']}:{c['span_start']}:{c['span_end']}"
            claim = node('claim', ref, c['raw_text'], {'span_start': c['span_start'], 'span_end': c['span_end'], 'attribute': c['attribute'], 'content_id': str(item['id'])})
            edge(content, claim, 'asserts', evidence={'quote': c['raw_text']})
            edge(claim, content, 'extracted_from', evidence={'quote': c['raw_text']})
            for f, fact in fact_nodes:
                linked = (str(item['version_id']), c['span_start'], c['span_end'], str(f['id'])) in link_set
                prefix = (item.get('body_text') or '')[max(0, c['span_start'] - 24):c['span_start']]
                approximate = bool(re.search(r'\b(?:nearly|almost|around|approximately|about|roughly)\s*$', prefix, re.I))
                match = match_claim(f, {**c, '_approximate': approximate}, linked)
                vector = vectors.get((str(item['version_id']), c['span_start'], c['span_end'], str(f['id']), c['raw_text']))
                # An embedding may suggest a relationship, never confirm it.
                if vector and (match is None or match['method'] == 'local-similarity'):
                    edge(fact, claim, 'supports', 'embedding', round(vector['score'], 4),
                         {'quote': c['raw_text'], 'match_type': 'possible', 'model': vector['model']})
                elif match:
                    edge(fact, claim, 'supports', match['method'], match['score'], {'quote': c['raw_text'], 'match_type': match['match_type'], **({'confidence_band': match['confidence_band']} if 'confidence_band' in match else {})})
    return nodes, edges


def graph_impact_paths(fact_ref: str, nodes: list[dict], edges: list[dict]) -> dict | None:
    """Traverse fact → claim → content → channel, preserving each evidence path.

    Graph relationships describe a snapshot of current fact matches, not a
    historical stale-content scan. The input must already be tenant scoped.
    """
    by_id = {str(n['id']): n for n in nodes}
    fact = next((n for n in nodes if n['node_type'] == 'fact' and str(n['ref_id']) == str(fact_ref)), None)
    if not fact:
        return None
    outgoing = {}
    for edge in edges:
        outgoing.setdefault(str(edge['src_id']), []).append(edge)
    results = []
    for support in outgoing.get(str(fact['id']), []):
        if support['edge_type'] != 'supports':
            continue
        claim = by_id.get(str(support['dst_id']))
        if not claim or claim['node_type'] != 'claim':
            continue
        evidence = support.get('evidence') or {}
        # Only the recognized deterministic methods can ever be confirmed.
        classification = ('confirmed' if support['match_method'] in ('attribute', 'link')
                          and evidence.get('match_type') == 'confirmed' else 'possible')
        for extracted in outgoing.get(str(claim['id']), []):
            if extracted['edge_type'] != 'extracted_from':
                continue
            content = by_id.get(str(extracted['dst_id']))
            if not content or content['node_type'] != 'content':
                continue
            channels = []
            for edge in outgoing.get(str(content['id']), []):
                channel = by_id.get(str(edge['dst_id']))
                if edge['edge_type'] == 'published_on' and channel and channel['node_type'] == 'channel':
                    channels.append(channel['label'])
            if len(results) >= 10000:
                raise ValueError('Too many dependency paths to display safely')
            results.append({'content_id': str(content['ref_id']), 'title': content['label'],
                            'status': (content.get('meta') or {}).get('status'),
                            'registered_state': (content.get('meta') or {}).get('registered_state'),
                            'channels': sorted(set(channels)), 'claim': claim['label'],
                            'span_start': (claim.get('meta') or {}).get('span_start'),
                            'span_end': (claim.get('meta') or {}).get('span_end'),
                            'match_type': classification, 'method': support['match_method'],
                            'score': float(support['score']) if support.get('score') is not None else None})
    priority = {'published': 0, 'scheduled': 1, 'in_review': 2, 'draft': 3}
    results.sort(key=lambda p: (priority.get(p['registered_state'], priority.get(p['status'], 4)),
                                p['title'], p['content_id'], p['span_start'] if isinstance(p['span_start'], int) else -1,
                                p['method']))
    return {'fact_id': str(fact['ref_id']), 'fact_label': fact['label'], 'paths': results,
            'scope_note': 'Snapshot relationships across registered content only; rebuild the graph after changes. Channel assignment is not proof of publication.',
            'limitations': 'These paths relate current facts to claims; they do not establish that content is stale or that a future change will affect it. Similarity is experimental; all possible matches require human review.'}
