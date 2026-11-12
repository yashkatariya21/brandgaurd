import pytest
from scripts.ci_test_summary import check_report


def test_report_requires_real_cases_without_skips_or_failures(tmp_path):
    path = tmp_path / 'junit.xml'
    path.write_text('<testsuites><testsuite><testcase name="one"/></testsuite></testsuites>')
    assert check_report(path) == 1
    for xml in ('<testsuite/>', '<testsuite><testcase><skipped/></testcase></testsuite>',
                '<testsuite><testcase><failure/></testcase></testsuite>'):
        path.write_text(xml)
        with pytest.raises(ValueError):
            check_report(path)
