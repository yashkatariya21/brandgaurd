"""Bounded, offline lexical candidate retrieval; not embeddings or a semantic model.

This matcher deliberately returns only Possible evidence. It cannot determine
whether a paraphrase is a claim, whether it is stale, or whether it is true.
"""
from __future__ import annotations

import re

# Small explicit vocabulary: all other words are matched literally.
_EQUIVALENTS = {
    'client': 'customer', 'clients': 'customer', 'customers': 'customer',
    'users': 'user', 'teams': 'team', 'organisations': 'organization',
    'organizations': 'organization', 'organisation': 'organization',
    'hosted': 'host', 'hosting': 'host', 'hosts': 'host',
    'stored': 'store', 'storing': 'store', 'stores': 'store',
    'information': 'data', 'europe': 'eu', 'european': 'eu',
    'union': 'eu', 'europeanunion': 'eu',
}
_STOP = {'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in',
         'is', 'it', 'of', 'on', 'our', 'the', 'their', 'this', 'to', 'we', 'with'}
_TOKEN = re.compile(r"[a-z]+|\d+(?:[,.]\d+)*", re.IGNORECASE)
_SEGMENTS = re.compile(r'[^.!?\n]+(?:[.!?]|$)')
_MAX_BODY = 100_000
_MAX_SEGMENTS = 500


def _terms(text: str) -> set[str]:
    words = (m.group().casefold() for m in _TOKEN.finditer(text))
    return {_EQUIVALENTS.get(word, word) for word in words if word not in _STOP}


def offline_candidate(body: str, old_text: str, new_text: str) -> dict | None:
    """Find a lexical-overlap candidate with exact source offsets.

    Digit-bearing facts are excluded: numeric near matches are not equivalent.
    If a passage is at least as similar to the new value, it is not suggested.
    """
    old, new = _terms(old_text), _terms(new_text)
    if len(old) < 2 or old == new or any(any(ch.isdigit() for ch in term) for term in old | new):
        return None
    best = None
    for index, match in enumerate(_SEGMENTS.finditer(body[:_MAX_BODY])):
        if index >= _MAX_SEGMENTS:
            break
        text = match.group()
        terms = _terms(text)
        overlap = len(old & terms) / len(old)
        new_overlap = len(new & terms) / len(new) if new else 0.0
        if overlap < 0.8 or new_overlap >= overlap:
            continue
        start = match.start() + len(text) - len(text.lstrip())
        end = match.end() - (len(text) - len(text.rstrip()))
        if end <= start:
            continue
        if best is None or overlap > best['similarity']:
            best = {'match_type': 'possible', 'match_method': 'offline_lexical',
                    'stale_text': body[start:end], 'span_start': start, 'span_end': end,
                    'similarity': overlap}
    return best
