"""Evidence validation and repeat-run grouping for Red Team.

These helpers are pure and do not grant access to records. The caller must
supply a catalogue of versioned records retrieved inside its tenant context.
"""
from __future__ import annotations

from difflib import SequenceMatcher
from math import ceil


def _normalised_with_offsets(text: str) -> tuple[str, list[tuple[int, int]]]:
    chars: list[str] = []
    offsets: list[tuple[int, int]] = []
    i = 0
    while i < len(text):
        if text[i].isspace():
            start = i
            while i < len(text) and text[i].isspace():
                i += 1
            if chars and i < len(text):
                chars.append(' ')
                offsets.append((start, i))
        else:
            chars.append(text[i])
            offsets.append((i, i + 1))
            i += 1
    return ''.join(chars), offsets


def validate_citations(citations: object, content: str, content_version_id: str,
                       catalogue: dict[tuple[str, str, int], str]) -> list[dict] | None:
    """Return checked citations or None; never fill in missing/fabricated evidence.

    Catalogue entries map (kind, reference id, version) to the approved text
    from the tenant-scoped run snapshot. Passage offsets refer to original text.
    """
    if not isinstance(citations, list) or not citations:
        return None
    checked = []
    for citation in citations:
        if not isinstance(citation, dict):
            return None
        kind, ref, version, quote = (citation.get(k) for k in ('kind', 'ref_id', 'version', 'quote'))
        if kind not in ('fact', 'rule', 'passage') or not isinstance(ref, str) or not isinstance(quote, str) or not quote.strip():
            return None
        if kind == 'passage':
            if ref != str(content_version_id):
                return None
            normalised, offsets = _normalised_with_offsets(content)
            needle, _ = _normalised_with_offsets(quote)
            start = normalised.find(needle) if needle else -1
            if start < 0:
                return None
            checked.append({'kind': kind, 'ref_id': ref, 'version': version, 'quote': quote,
                            'span_start': offsets[start][0], 'span_end': offsets[start + len(needle) - 1][1]})
        else:
            if isinstance(version, bool) or not isinstance(version, int):
                return None
            record_text = catalogue.get((kind, ref, version))
            if record_text is None or quote not in record_text:
                return None
            checked.append({'kind': kind, 'ref_id': ref, 'version': version, 'quote': quote})
    return checked


def cluster_findings(runs: list[list[dict]], total_runs: int) -> list[dict]:
    """Group by persona, category, overlapping source span and similar issue.

    Count at most one appearance per run; stability does not change finding type.
    Input findings must already have validated passage offsets and category.
    """
    if total_runs < 1 or len(runs) != total_runs:
        raise ValueError('total_runs must match the supplied runs')
    clusters: list[dict] = []
    for run_number, findings in enumerate(runs):
        for finding in findings:
            start, end = finding.get('span_start'), finding.get('span_end')
            if not isinstance(start, int) or not isinstance(end, int) or end <= start:
                continue
            group = None
            for candidate in clusters:
                rep = candidate['finding']
                if (run_number not in candidate['_runs'] and rep.get('persona') == finding.get('persona')
                    and rep.get('category') == finding.get('category')
                    and start < rep['span_end'] and rep['span_start'] < end
                    and SequenceMatcher(None, rep.get('issue', '').lower(), finding.get('issue', '').lower()).ratio() >= .65):
                    group = candidate
                    break
            if group is None:
                group = {'finding': finding.copy(), '_runs': set()}
                clusters.append(group)
            group['_runs'].add(run_number)
    return [{**group['finding'], 'appearances': len(group['_runs']), 'total_runs': total_runs,
             'stable': len(group['_runs']) >= ceil(2 * total_runs / 3),
             'finding_type': 'possible'} for group in clusters]
