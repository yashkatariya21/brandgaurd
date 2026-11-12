"""Fail CI if its PostgreSQL-backed test run silently skips any tests."""
import sys
import xml.etree.ElementTree as ET


def check_report(path):
    root = ET.parse(path).getroot()
    cases = list(root.iter('testcase'))
    if not cases:
        raise ValueError('Test report contains no test cases')
    skipped = [c for c in cases if c.find('skipped') is not None]
    failed = [c for c in cases if c.find('failure') is not None or c.find('error') is not None]
    if skipped or failed:
        raise ValueError(f'{len(skipped)} skipped and {len(failed)} failed/error tests in {len(cases)} cases')
    return len(cases)


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python -m scripts.ci_test_summary <junit.xml>')
    try:
        count = check_report(sys.argv[1])
    except (ValueError, OSError, ET.ParseError) as exc:
        raise SystemExit(f'CI test report invalid: {exc}') from exc
    print(f'Backend test report: {count} passed, 0 skipped.')


if __name__ == '__main__':
    main()
