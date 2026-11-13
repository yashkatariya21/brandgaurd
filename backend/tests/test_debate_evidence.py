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


def test_repeated_deterministic_quote_preserves_finding_span():
    finding = {'source_kind': 'deterministic', 'content_version_id': 'v', 'span_start': 5, 'span_end': 9}
    evidence, rejected = finding_evidence(finding, 'text text', {})
    assert rejected == 0
    assert (evidence[0]['span_start'], evidence[0]['span_end']) == (5, 9)


def test_passage_citation_cannot_claim_a_version_number():
    finding = {'source_kind': 'persona', 'content_version_id': 'v', 'citations': [
        {'kind': 'passage', 'ref_id': 'v', 'version': 3, 'quote': 'text'}]}
    assert finding_evidence(finding, 'text', {}) == ([], 1)


def test_demo_argument_references_only_checked_evidence():
    from app.services.debate_evidence import demo_argument_evidence
    finding = {'source_kind': 'persona', 'content_version_id': 'v', 'citations': [
        {'kind': 'passage', 'ref_id': 'v', 'version': None, 'quote': 'actual passage'},
        {'kind': 'rule', 'ref_id': 'other-tenant', 'version': 1, 'quote': 'secret'}]}
    evidence, rejected = finding_evidence(finding, 'actual passage', {})
    output = demo_argument_evidence(evidence)
    assert rejected == 1
    for side in ('prosecutor', 'defender'):
        assert len(output['argument_citations'][side]) == 1
        assert output['argument_citations'][side][0]['quote'] == 'actual passage'
    assert 'does not prove' in output['argument_evidence_note']


def test_demo_argument_with_no_evidence_does_not_invent_sources():
    from app.services.debate_evidence import demo_argument_evidence
    output = demo_argument_evidence([])
    assert not output['argument_citations']['prosecutor']
    assert not output['argument_citations']['defender']
    assert 'No validated evidence' in output['prosecutor_text']


def test_legacy_hosted_debate_is_not_displayed_without_argument_validation():
    from app.services.debate_evidence import safe_cached_debate
    cached = {'model_id': 'legacy-model', 'prosecutor_text': 'Fake figure: 999%',
              'defender_text': 'Unsupported assertion', 'minimal_edit': 'Fake edit'}
    result = safe_cached_debate(cached, [])
    assert result['mode'] == 'demo'
    assert '999%' not in result['prosecutor_text']
    assert 'Unsupported assertion' not in result['defender_text']
    assert result['minimal_edit'] is None
    assert 'not validated' in result['demo_note']
    assert cached['minimal_edit'] == 'Fake edit'  # presentation only; do not rewrite history
