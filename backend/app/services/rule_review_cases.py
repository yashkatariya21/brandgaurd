"""Build human-review cases from versioned rule examples, not AI verdicts."""


def build_review_cases(examples: list[dict]) -> list[dict]:
    """Preserve source examples and create bounded, explicitly unjudged variants.

    Source labels are repository-provided expectations, not verified truth.
    Conflicting source labels and all transformations require human review.
    """
    labels = {'good': 'pass', 'bad': 'fail', 'borderline': 'borderline'}
    sources = {}
    for example in examples[:20]:
        text, kind = example.get('text'), example.get('kind')
        if not isinstance(text, str) or not text.strip() or kind not in labels:
            continue
        sources.setdefault(text, set()).add(labels[kind])
    result = [{'text': text, 'axis': 'source_example' if len(expected) == 1 else 'conflicting_examples',
               'intended_label': next(iter(expected)) if len(expected) == 1 else 'borderline'}
              for text, expected in sources.items()]
    seen = set(sources)
    for text in sources:
        for candidate, axis in [(text.upper(), 'case_variant'),
                                (' '.join(text.split()), 'whitespace_variant')]:
            if candidate not in seen:
                seen.add(candidate)
                result.append({'text': candidate, 'axis': axis, 'intended_label': 'borderline'})
    return result
