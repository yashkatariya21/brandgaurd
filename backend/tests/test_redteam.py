"""T6 – Red Team and debate tests.

Pure-function tests need no DB. DB tests use the existing conftest fixtures.
"""
import pytest

from app.services.redteam import run_red_team, run_prosecutor_defender, _stub_debate, PERSONAS


# ─── Demo-mode output validates against schema ──────────────────────────────

class TestDemoMode:
    """These run without OPENAI_API_KEY – verifies stub output is well-formed."""

    def test_run_red_team_returns_four_personas(self):
        results = run_red_team("NimbusDesk is guaranteed 100% uptime.", "", "")
        assert len(results) == 4

    def test_persona_names(self):
        results = run_red_team("NimbusDesk is guaranteed 100% uptime.", "", "")
        names = [r["persona"] for r in results]
        assert "Brand Police" in names
        assert "Legal Eagle" in names
        assert "Customer Voice" in names
        assert "Competitor Watch" in names

    def test_each_result_has_findings_list(self):
        results = run_red_team("NimbusDesk is guaranteed 100% uptime.", "", "")
        for r in results:
            assert isinstance(r["findings"], list)

    def test_finding_has_required_fields(self):
        results = run_red_team("NimbusDesk is guaranteed 100% uptime.", "", "")
        for r in results:
            for f in r["findings"]:
                assert "issue" in f
                assert "severity" in f
                assert f["severity"] in ("low", "medium", "high", "critical")

    def test_legal_finding_on_guarantee_claim(self):
        results = run_red_team("Guaranteed 100% uptime for all customers.", "", "")
        legal = next(r for r in results if r["persona"] == "Legal Eagle")
        assert len(legal["findings"]) > 0
        issues_text = " ".join(f["issue"] for f in legal["findings"]).lower()
        assert "guarantee" in issues_text or "absolute" in issues_text or "100" in issues_text

    def test_legal_finding_on_iso27001(self):
        results = run_red_team("ISO 27001 certified.", "", "")
        legal = next(r for r in results if r["persona"] == "Legal Eagle")
        assert any("27001" in f["issue"] or "certified" in f["issue"].lower()
                   for f in legal["findings"])

    def test_legal_finding_on_embargo(self):
        results = run_red_team("Project Heron launches in Q1.", "", "")
        legal = next(r for r in results if r["persona"] == "Legal Eagle")
        assert any("heron" in f["issue"].lower() or "embargo" in f["issue"].lower()
                   for f in legal["findings"])

    def test_invalid_llm_json_handled(self):
        """Simulates invalid JSON from LLM – the pydantic error path."""
        from app.services.redteam import _parse_persona_findings
        # Invalid JSON → returns None
        assert _parse_persona_findings("not json at all") is None
        # Empty string
        assert _parse_persona_findings("") is None
        # Valid JSON array passes through
        result = _parse_persona_findings('[{"issue":"x","severity":"high","span_hint":""}]')
        assert result is not None
        assert result[0]["issue"] == "x"


# ─── Prosecutor/Defender debate ──────────────────────────────────────────────

class TestDebate:
    def test_stub_debate_structure(self):
        result = _stub_debate("Guaranteed 100% uptime claim detected.")
        assert "prosecutor" in result
        assert "defender" in result
        assert "minimal_edit" in result
        # Must NOT have a verdict key
        assert "verdict" not in result

    def test_run_prosecutor_defender_no_verdict(self):
        result = run_prosecutor_defender(
            "Guaranteed 100% uptime",
            "NimbusDesk offers guaranteed 100% uptime for all customers.",
            "Fact: uptime_sla = 99.9% monthly uptime, Enterprise plan SLA only",
        )
        assert "prosecutor" in result
        assert "defender" in result
        # No verdict
        assert "verdict" not in result

    def test_both_sides_non_empty(self):
        result = run_prosecutor_defender("issue text", "content text", "fact context")
        assert len(result["prosecutor"]) > 10
        assert len(result["defender"]) > 10
