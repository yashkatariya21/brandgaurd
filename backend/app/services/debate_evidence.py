"""Validate the finding's supporting evidence for display alongside a debate.

These citations do not establish that either argument is true or that an
argument cited a source itself. The caller supplies a tenant-scoped catalogue.
"""
from .grounding import validate_citations


def finding_evidence(finding: dict, content: str, catalogue: dict) -> tuple[list[dict], int]:
    citations = finding.get('citations') or []
    if finding.get('source_kind') != 'persona':
        start, end = finding.get('span_start'), finding.get('span_end')
        if (isinstance(start, int) and not isinstance(start, bool)
                and isinstance(end, int) and not isinstance(end, bool)
                and 0 <= start < end <= len(content)):
            citations = [{'kind': 'passage', 'ref_id': str(finding['content_version_id']),
                          'version': None, 'quote': content[start:end]}]
    if not isinstance(citations, list):
        return [], 1
    checked, rejected = [], 0
    deterministic_span = finding.get('source_kind') != 'persona' and isinstance(start, int) and not isinstance(start, bool) and isinstance(end, int) and not isinstance(end, bool) and 0 <= start < end <= len(content)
    for citation in citations:
        validated = validate_citations([citation], content, str(finding['content_version_id']), catalogue)
        if validated:
            # The same quote may occur several times. Preserve the original
            # finding's exact span, rather than silently pointing at the first.
            if deterministic_span and citation['kind'] == 'passage':
                validated[0]['span_start'], validated[0]['span_end'] = start, end
            checked.extend(validated)
        else:
            rejected += 1
    return checked, rejected


def demo_argument_evidence(evidence: list[dict]) -> dict:
    """Attach already revalidated references to neutral, deterministic prompts.

    Reference validity does not prove an interpretation. No reference is
    constructed or filled in here; the caller must revalidate every request.
    """
    citations = [dict(c) for c in evidence if c.get('kind') in ('passage', 'rule', 'fact')]
    if not citations:
        return {
            'prosecutor_text': 'No validated evidence is available. Review the original passage and applicable records before deciding whether a change is needed.',
            'defender_text': 'No validated evidence is available. Review the original context and applicable records before deciding whether the concern applies.',
            'argument_citations': {'prosecutor': [], 'defender': []},
            'argument_evidence_note': 'No validated references are available for these review prompts.',
        }
    return {
        'prosecutor_text': 'Consider whether the referenced evidence supports the concern and whether the passage needs revision. Check the complete context before deciding.',
        'defender_text': 'Consider whether the referenced evidence and surrounding context limit or rebut the concern. Check whether the cited records apply before deciding.',
        'argument_citations': {'prosecutor': citations, 'defender': [dict(c) for c in citations]},
        'argument_evidence_note': 'References were checked against tenant records; their presence does not prove that either interpretation is correct.',
    }


def safe_cached_debate(debate: dict, evidence: list[dict]) -> dict:
    """Do not display legacy arguments lacking per-argument validation.

    No historical debate row stores verified argument-level citations. Keep the
    row unchanged in storage, but replace its presentation with neutral prompts.
    """
    result = dict(debate)
    result.update(demo_argument_evidence(evidence))
    result['minimal_edit'] = None
    result['mode'] = 'demo'
    result['demo_note'] = ('Cached arguments are not displayed because their argument-level citations '
                           'were not validated. These are neutral deterministic review prompts.')
    return result
