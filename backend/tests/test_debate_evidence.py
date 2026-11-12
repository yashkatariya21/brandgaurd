from app.services.debate_evidence import finding_evidence


def test_persona_evidence_validated_against_versioned_tenant_catalogue():
    finding = {'source_kind': 'persona', 'content_version_id': 'v1', 'citations': [
        {'kind': 'passage', 'ref_id': 'v1', 'version': None, 'quote': 'real text'},
        {'kind': 'rule', 'ref_id': 'rule1', 'version': 2, 'quote': 'Never claim'},
        {'kind': 'rule', 'ref_id': 'other-tenant', 'version': 2, 'quote': 'Never claim'},
    ]}
    evidence, rejected = finding_evidence(finding, 'Some real text.', {('rule', 'rule1', 2): 'Never claim unsupported facts.'})
    assert len(evidence) == 2 and rejected == 1
    assert evidence[0]['span_start'] == 5
    assert evidence[1]['ref_id'] == 'rule1'


def test_deterministic_finding_uses_only_valid_span():
    finding = {'source_kind': 'deterministic', 'content_version_id': 'v', 'span_start': 0, 'span_end': 4}
    evidence, rejected = finding_evidence(finding, 'text body', {})
    assert evidence[0]['quote'] == 'text' and rejected == 0
    finding['span_end'] = 999
    assert finding_evidence(finding, 'text body', {}) == ([], 0)


def test_rejects_tampered_quotes_and_wrong_version():
    finding = {'source_kind': 'persona', 'content_version_id': 'v', 'citations': [
        {'kind':'passage', 'ref_id':'v', 'version':None, 'quote':'not present'},
        {'kind':'rule', 'ref_id':'r', 'version':99, 'quote':'Text'}]}
    assert finding_evidence(finding, 'present', {('rule','r',1):'Text'}) == ([], 2)
