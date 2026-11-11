from scripts.ci_test_summary import main


def test_ci_requires_tests_and_no_skips(tmp_path):
    path = tmp_path / 'result.xml'
    path.write_text('<testsuites><testsuite><testcase name="a"/></testsuite></testsuites>')
    assert main(str(path)) == 0
    path.write_text('<testsuites><testsuite><testcase name="a"><skipped/></testcase></testsuite></testsuites>')
    assert main(str(path)) == 1
    path.write_text('<testsuites><testsuite/></testsuites>')
    assert main(str(path)) == 1
