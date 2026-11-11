"""Fail CI on skipped tests and publish actual JUnit counts as a check annotation."""
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def main(path: str = 'test-results.xml') -> int:
    root = ET.parse(Path(path)).getroot()
    cases = root.findall('.//testcase')
    counts = {'tests': len(cases), 'passed': 0, 'failed': 0, 'errors': 0, 'skipped': 0}
    for case in cases:
        for status in ('failure', 'error', 'skipped'):
            if case.find(status) is not None:
                counts[{'failure': 'failed', 'error': 'errors', 'skipped': 'skipped'}[status]] += 1
                break
        else:
            counts['passed'] += 1
    message = ', '.join(f'{k}={v}' for k, v in counts.items())
    print(f'::notice title=Backend test results::{message}')
    if counts['tests'] == 0 or counts['failed'] or counts['errors'] or counts['skipped']:
        print('Full database-backed CI requires tests to run without failures or skips.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1] if len(sys.argv) > 1 else 'test-results.xml'))
