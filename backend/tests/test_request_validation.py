import pytest
from pydantic import ValidationError

from app.api.auth import RegisterIn
from app.api.facts import FactIn
from app.api.rules import RuleIn
from app.api.content import ContentItemIn


def test_registration_rejects_bcrypt_overlong_utf8_password():
    with pytest.raises(ValidationError):
        RegisterIn(
            org_name="Example Org",
            org_slug="example-org",
            email="person@example.test",
            display_name="Person",
            password="é" * 37,
        )


def test_fact_rejects_expiry_before_valid_from():
    with pytest.raises(ValidationError):
        FactIn(
            key="valid_fact",
            label="Valid fact",
            category="statistic",
            value_text="A value",
            valid_from="2026-10-10",
            expires_at="2026-10-09",
        )


def test_fact_rejects_unknown_qualifier():
    with pytest.raises(ValidationError):
        FactIn(
            key="valid_fact",
            label="Valid fact",
            category="statistic",
            value_text="A value",
            qualifier="guess",
        )


def test_rule_rejects_unknown_severity():
    with pytest.raises(ValidationError):
        RuleIn(
            key="R-TEST",
            label="Test rule",
            category="tone",
            severity="urgent",
            description="A test rule description",
        )


def test_content_channel_and_text_limits_are_validated():
    with pytest.raises(ValidationError):
        ContentItemIn(title="Copy", channel="unsupported", body_text="Body")
    with pytest.raises(ValidationError):
        ContentItemIn(title="Copy", channel="web", body_text="x" * 1_000_001)
