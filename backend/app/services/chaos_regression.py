"""Compare saved deterministic checker runs; a diff is not a correctness verdict."""


def compare_checker_cases(previous: list[dict], current: list[dict]) -> dict:
    """Compare exact text identities and expected/observed labels across two runs."""
    def indexed(rows):
        result = {}
        for row in rows:
            key = row['text']
            if key in result:
                raise ValueError('Checker case texts must be unique within a run')
            result[key] = {'expected': row['intended_label'],
                           'observed': row.get('observed', row.get('majority_verdict'))}
        return result
    old, new = indexed(previous), indexed(current)
    added = [{'text': text, **new[text]} for text in sorted(new.keys() - old.keys())]
    removed = [{'text': text, **old[text]} for text in sorted(old.keys() - new.keys())]
    changed = [{'text': text, 'before': old[text], 'after': new[text]}
               for text in sorted(old.keys() & new.keys()) if old[text] != new[text]]
    return {'added': added, 'removed': removed, 'changed': changed,
            'unchanged': len(old.keys() & new.keys()) - len(changed)}
