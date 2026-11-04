"""T6 – Chaos testing pure-function tests (no DB required)."""
import pytest
from collections import Counter

from app.services.chaos import (
    generate_chaos_cases,
    interpret_case,
    detect_ambiguities,
    _demo_interpret,
)


# ─── Agreement maths ────────────────────────────────────────────────────────

class TestAgreementMaths:
    def test_all_same_verdict_agreement_is_1(self):
        verdicts = ["pass", "pass", "pass", "pass", "pass"]
        cnt = Counter(verdicts)
        majority, count = cnt.most_common(1)[0]
        agreement = count / len(verdicts)
        assert agreement == 1.0
        assert majority == "pass"

    def test_split_4_1_agreement(self):
        verdicts = ["fail", "fail", "fail", "fail", "pass"]
        cnt = Counter(verdicts)
        majority, count = cnt.most_common(1)[0]
        agreement = count / len(verdicts)
        assert abs(agreement - 0.8) < 0.001

    def test_split_3_2_is_ambiguous(self):
        verdicts = ["fail", "fail", "fail", "pass", "pass"]
        cnt = Counter(verdicts)
        majority, count = cnt.most_common(1)[0]
        agreement = count / len(verdicts)
        assert agreement == 0.6
        assert agreement < 0.8  # ambiguous

    def test_ambiguous_flag_rule(self):
        """A case is ambiguous when agreement < 0.8."""
        agreement = 0.6
        is_ambiguous = agreement < 0.8
        assert is_ambiguous

        agreement = 0.8
        is_ambiguous = agreement < 0.8
        assert not is_ambiguous

    def test_five_verdicts_returned(self):
        verdicts = _demo_interpret("Use professional tone.", "Hello world.", n=5)
        assert len(verdicts) == 5

    def test_all_verdicts_valid(self):
        verdicts = _demo_interpret("Use professional tone.", "HEY FOLKS!! 🎉🎉🎉", n=5)
        for v in verdicts:
            assert v in ("pass", "fail", "borderline")


# ─── Balanced case set ──────────────────────────────────────────────────────

class TestBalancedCaseSet:
    def _get_tone_rule(self):
        return {
            "key": "R-01",
            "label": "Friendly and professional tone",
            "category": "tone",
            "severity": "medium",
            "description": "Use a friendly and professional tone.",
            "expected_behaviour": "Flag clearly rude or clearly stiff text",
        }

    def test_tone_rule_generates_cases(self):
        rule = self._get_tone_rule()
        cases = generate_chaos_cases(rule)
        assert len(cases) >= 4, "Should generate at least 4 cases"

    def test_tone_rule_has_all_three_labels(self):
        rule = self._get_tone_rule()
        cases = generate_chaos_cases(rule)
        labels = {c["intended_label"] for c in cases}
        # Must have at least pass and fail
        assert "pass" in labels
        assert "fail" in labels

    def test_tone_rule_has_borderline_case(self):
        rule = self._get_tone_rule()
        cases = generate_chaos_cases(rule)
        assert any(c["intended_label"] == "borderline" for c in cases)

    def test_tone_rule_has_clear_pass_cases(self):
        rule = self._get_tone_rule()
        cases = generate_chaos_cases(rule)
        pass_cases = [c for c in cases if c["intended_label"] == "pass"]
        assert len(pass_cases) >= 3  # ~4 clear pass cases

    def test_tone_rule_has_clear_fail_cases(self):
        rule = self._get_tone_rule()
        cases = generate_chaos_cases(rule)
        fail_cases = [c for c in cases if c["intended_label"] == "fail"]
        assert len(fail_cases) >= 3  # ~4 clear fail cases


# ─── Deterministic interpreter behaviour ────────────────────────────────────

class TestDemoInterpreter:
    def test_all_caps_fails(self):
        verdicts = _demo_interpret("Use professional tone.", "WE ARE VERY PLEASED TO ANNOUNCE.", n=5)
        fail_count = verdicts.count("fail")
        assert fail_count >= 3, "ALL CAPS should predominantly fail"

    def test_emoji_fails(self):
        verdicts = _demo_interpret("Use professional tone.", "Hey folks!! 🎉🎉🎉", n=5)
        fail_count = verdicts.count("fail")
        assert fail_count >= 3, "Emoji + exclamations should predominantly fail"

    def test_professional_text_passes(self):
        verdicts = _demo_interpret("Use professional tone.",
                                   "We are pleased to welcome you to NimbusDesk.", n=5)
        pass_count = verdicts.count("pass")
        assert pass_count >= 3, "Professional text should predominantly pass"

    def test_borderline_case_splits(self):
        """Single exclamation and warm greeting — should be borderline for some interpreters."""
        verdicts = _demo_interpret("Use professional tone.",
                                   "Great news! Your order has shipped.", n=5)
        # Should not be unanimous — at least one non-fail expected
        non_fail = [v for v in verdicts if v != "fail"]
        assert len(non_fail) >= 1, "Borderline case should split interpreters"


# ─── detect_ambiguities ──────────────────────────────────────────────────────

class TestDetectAmbiguities:
    def test_unclear_expected_behaviour_flagged(self):
        rules = [{
            "key": "R-09",
            "label": "Short headlines",
            "category": "other",
            "description": "Keep headlines short.",
            "expected_behaviour": "Unclear threshold",
        }]
        issues = detect_ambiguities(rules)
        # Should flag unclear threshold or missing examples
        assert len(issues) > 0

    def test_tone_contradiction_detected(self):
        rules = [
            {
                "key": "R-02",
                "label": "Use contractions",
                "category": "tone",
                "description": "Use contractions to sound natural.",
                "expected_behaviour": "Suggest contraction",
                "examples": [],
            },
            {
                "key": "R-03",
                "label": "Formal external tone",
                "category": "tone",
                "description": "Maintain a formal tone in all external communications.",
                "expected_behaviour": "Flag casual text",
                "examples": [],
            },
        ]
        issues = detect_ambiguities(rules)
        contradiction = [i for i in issues if i["kind"] == "contradiction"]
        assert contradiction, "Should detect contradiction between contractions and formal tone"
