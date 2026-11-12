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
    for citation in citations:
        validated = validate_citations([citation], content, str(finding['content_version_id']), catalogue)
        if validated:
            checked.extend(validated)
        else:
            rejected += 1
    return checked, rejected
