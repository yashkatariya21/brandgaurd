from app.services.rule_review_cases import build_review_cases


def test_cases_use_approved_examples_and_variants_are_unjudged():
    cases = build_review_cases([{'kind':'bad', 'text':'Do not say this.'}])
    assert cases[0] == {'text':'Do not say this.', 'axis':'source_example', 'intended_label':'fail'}
    assert cases[1]['text'] == 'DO NOT SAY THIS.'
    assert cases[1]['intended_label'] == 'borderline'


def test_deduplicates_and_does_not_invent_examples():
    assert build_review_cases([]) == []
    cases = build_review_cases([{'kind':'good', 'text':'A  B'}, {'kind':'bad','text':'A  B'}])
    assert len({c['text'] for c in cases}) == len(cases)
    assert next(c for c in cases if c['text']=='A B')['intended_label'] == 'borderline'


def test_invalid_examples_ignored_and_bound_is_enforced():
    assert build_review_cases([{'kind':'bad', 'text':' '}, {'kind':'unknown', 'text':'x'}]) == []
    examples = [{'kind':'good', 'text':f'case {i}'} for i in range(100)]
    assert len(build_review_cases(examples)) <= 40


def test_conflicting_source_examples_are_not_silently_resolved():
    cases = build_review_cases([{'kind':'good', 'text':'Same'}, {'kind':'bad', 'text':'Same'}])
    assert cases[0]['axis'] == 'conflicting_examples'
    assert cases[0]['intended_label'] == 'borderline'


def test_original_examples_take_precedence_over_variations():
    cases = build_review_cases([{'kind':'good', 'text':'alpha'}, {'kind':'bad', 'text':'ALPHA'}])
    assert cases[1] == {'text':'ALPHA', 'axis':'source_example', 'intended_label':'fail'}


def test_review_api_persists_unjudged_cases_and_scopes_queries(monkeypatch):
    from contextlib import contextmanager
    from uuid import uuid4
    from app.api import chaos
    from app.core.rbac import Principal
    org, user, rule, version = (uuid4() for _ in range(4))
    calls = []
    class Result:
        def __init__(self, one=None, rows=None): self.one, self.rows = one, rows
        def fetchone(self): return self.one
        def fetchall(self): return self.rows
    class Conn:
        def execute(self, sql, args=()):
            calls.append((sql, args))
            if 'FROM rules r' in sql:
                assert args == (rule, org)
                return Result(one={'key': 'R-test', 'version_id': version})
            if 'FROM rule_examples' in sql:
                assert args == (org, version)
                return Result(rows=[{'kind':'good', 'text':'Example'}])
            if 'INSERT INTO chaos_runs' in sql or 'INSERT INTO chaos_cases' in sql:
                assert args[1] == org
                return Result()
            raise AssertionError(sql)
    @contextmanager
    def tenant(*args):
        assert args == (org, user)
        yield Conn()
    monkeypatch.setattr(chaos, 'tenant_conn', tenant)
    monkeypatch.setattr(chaos, 'write_audit', lambda *args, **kwargs: None)
    result = chaos.create_review_cases(rule, Principal(user, org, 'admin'))
    assert result['cases'] and all(c['human_label'] is None for c in result['cases'])
    assert not any('chaos_results' in sql for sql, _ in calls)


def test_review_history_is_scoped_to_rule_and_tenant(monkeypatch):
    from contextlib import contextmanager
    from datetime import datetime, timezone
    from uuid import uuid4
    from app.api import chaos
    from app.core.rbac import Principal
    org, user, rule, run = (uuid4() for _ in range(4))
    class Result:
        def __init__(self, one=None, rows=None): self.one, self.rows = one, rows
        def fetchone(self): return self.one
        def fetchall(self): return self.rows
    class Conn:
        def execute(self, sql, args):
            if 'SELECT id, key FROM rules' in sql:
                assert args == (rule, org)
                return Result(one={'id':rule, 'key':'R-1'})
            assert args == (org, rule)
            assert "cr.prompt_version='review-cases-v1'" in sql
            return Result(rows=[{'id':run, 'created_at':datetime(2026,1,1,tzinfo=timezone.utc), 'version_no':2, 'case_count':3}])
    @contextmanager
    def tenant(*args): yield Conn()
    monkeypatch.setattr(chaos, 'tenant_conn', tenant)
    response = chaos.list_review_cases(rule, Principal(user, org, 'admin'))
    assert response['runs'][0]['run_id'] == str(run)
    assert response['runs'][0]['version_no'] == 2


def test_review_comparison_saves_a_point_in_time_scoped_diff(monkeypatch):
    from contextlib import contextmanager
    from uuid import uuid4
    from app.api import chaos
    from app.core.rbac import Principal
    org, user, rule, old, new = (uuid4() for _ in range(5))
    captured = []
    class Rows:
        def __init__(self, data): self.data = data
        def fetchall(self): return self.data
    class Conn:
        def execute(self, sql, args):
            assert args[0] == org and args[2] == rule
            assert 'FOR SHARE OF cc' in sql
            return Rows([{'text':'example', 'axis':'source_example', 'intended_label':'pass',
                          'human_label': 'fail' if args[1] == new else None}])
    @contextmanager
    def tenant(*args): yield Conn()
    monkeypatch.setattr(chaos, 'tenant_conn', tenant)
    monkeypatch.setattr(chaos, 'write_audit', lambda *args, **kwargs: captured.append(kwargs['after']))
    result = chaos.compare_review_runs(rule, chaos.CompareReviewBody(previous_run_id=old, current_run_id=new), Principal(user, org, 'admin'))
    assert result['diff']['changed'][0]['after']['human_label'] == 'fail'
    assert captured == [result]
