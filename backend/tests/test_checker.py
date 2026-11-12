"""T6 – Pure-function tests for checker / claim-extractor (no DB required)."""
import pytest

from app.services.claim_extractor import extract_claims, normalise_number


# ─── Banned product name forms ───────────────────────────────────────────────

class TestBannedNames:
    def test_nimbus_desk_two_words(self):
        claims = extract_claims("Nimbus Desk is the best help desk.")
        product = [c for c in claims if c["entity"] == "product_name"]
        assert product, "Should extract banned product name form"

    def test_nimbusDESK_caps(self):
        claims = extract_claims("NimbusDESK helps teams resolve tickets faster.")
        product = [c for c in claims if c["entity"] == "product_name"]
        assert product

    def test_short_name_and_extra_spacing(self):
        for text in ("Nimbus helps teams.", "Nimbus  Desk helps teams."):
            claims = extract_claims(text)
            assert any(c.get("attribute") == "banned_product_name" for c in claims)

    def test_nimbusdesk_correct_not_banned(self):
        claims = extract_claims("NimbusDesk agents resolve tickets faster.")
        # Correct form should not trigger banned_form entity
        banned = [c for c in claims if c.get("attribute") == "banned_product_name"]
        assert not banned


# ─── Embargo term detection ──────────────────────────────────────────────────

class TestEmbargoTerms:
    def test_project_heron(self):
        claims = extract_claims("Our upcoming feature (Project Heron) launches Q1.")
        embargo = [c for c in claims if c["attribute"] == "embargo_term"]
        assert embargo, "Should detect embargoed project name"


# ─── Certification claims ────────────────────────────────────────────────────

class TestCertifications:
    def test_soc2(self):
        claims = extract_claims("We are SOC 2 Type II certified.")
        certs = [c for c in claims if c["entity"] == "certification"]
        assert certs

    def test_iso27001(self):
        claims = extract_claims("ISO 27001 certification in progress.")
        certs = [c for c in claims if c["entity"] == "certification"]
        assert certs


# ─── Numeric claim extraction ────────────────────────────────────────────────

class TestNumericClaims:
    def test_customer_count(self):
        claims = extract_claims("Join 50,000+ customers who trust NimbusDesk.")
        numeric = [c for c in claims if c["value_number"] is not None and c["value_number"] == 50000]
        assert numeric, "Should extract 50,000 as numeric claim"

    def test_price(self):
        claims = extract_claims("Starter plan from $19 per agent per month.")
        prices = [c for c in claims if c["attribute"] == "price_per_agent_month"]
        assert prices

    def test_uptime(self):
        claims = extract_claims("99.9% monthly uptime guaranteed for Enterprise customers.")
        uptime = [c for c in claims if c["attribute"] == "uptime_percent"]
        assert uptime


# ─── Confirmed vs possible labels (conceptual) ──────────────────────────────
# These check that the claim extractor produces correct attribute labels,
# which the blast-radius and checker use to determine confirmed vs possible.

class TestAttributeLabels:
    def test_customers_maps_to_customer_count(self):
        claims = extract_claims("50,000+ customers trust us.")
        c = next((x for x in claims if x["value_number"] == 50000), None)
        assert c is not None
        assert c["attribute"] == "customer_count"

    def test_tickets_maps_to_ticket_volume(self):
        claims = extract_claims("Our agents handle 50,000 tickets every day.")
        c = next((x for x in claims if x["value_number"] == 50000), None)
        assert c is not None
        assert c["attribute"] == "ticket_volume"

    def test_support_teams_maps_to_customer_count(self):
        claims = extract_claims("Trusted by 50k+ support teams.")
        c = next((x for x in claims if x["value_number"] == 50000), None)
        assert c is not None
        assert c["attribute"] == "customer_count"


# ─── Superseded fact check helpers ──────────────────────────────────────────

class TestNormaliseOldValue:
    """Test _normalise_old_value from blast_radius API."""

    def test_text_with_plus(self):
        from app.api.blast_radius import _normalise_old_value
        assert _normalise_old_value("50,000+", None) == 50000.0

    def test_number_takes_priority(self):
        from app.api.blast_radius import _normalise_old_value
        assert _normalise_old_value("50,000+", 50000.0) == 50000.0

    def test_none_returns_none(self):
        from app.api.blast_radius import _normalise_old_value
        assert _normalise_old_value("", None) is None
