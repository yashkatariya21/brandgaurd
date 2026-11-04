"""NimbusDesk fictional demo data (from the NimbusDesk Evaluation Pack). All values are invented."""

ROLES = ["admin", "brand_manager", "approver", "manager", "creator", "external_creator"]
USER_EMAILS = {
    "admin": "admin@nimbusdesk.example",
    "brand_manager": "brand@nimbusdesk.example",
    "approver": "approver@nimbusdesk.example",
    "manager": "manager@nimbusdesk.example",
    "creator": "creator@nimbusdesk.example",
    "external_creator": "agency@nimbusdesk.example",
}

# key, label, category, value_text, value_number, value_unit, qualifier, source_ref, valid_from, expires_at
FACTS = [
    ("customer_count", "Customer count", "statistic", "50,000+ customers", 50000, "customers", "at_least", "Q3 Fact Sheet (previous edition)", "2025-10-01", "2026-12-31"),
    ("founding_year", "Founding year", "statistic", "2016", 2016, "year", "exact", "Company Profile", "2016-01-01", None),
    ("headquarters", "Headquarters", "location", "Pune, India", None, None, "exact", "Company Profile", "2016-01-01", None),
    ("uptime_sla", "Uptime commitment", "statistic", "99.9% monthly uptime, Enterprise plan SLA only", 99.9, "percent", "exact", "SLA v4", "2026-01-01", "2026-12-31"),
    ("starter_price", "Starter price", "pricing", "$19 per agent per month, billed annually", 19, "USD", "exact", "Pricing Sheet", "2026-01-01", "2026-12-31"),
    ("pro_price", "Pro price", "pricing", "$49 per agent per month, billed annually", 49, "USD", "exact", "Pricing Sheet", "2026-01-01", "2026-12-31"),
    ("soc2", "SOC 2 certification", "certification", "SOC 2 Type II (report period ended 2026-06-30)", None, None, "exact", "Audit Report", "2026-08-01", "2027-06-30"),
    ("iso27001", "ISO 27001 status", "certification", "Not certified. Certification in progress, no date promised", None, None, "exact", "Security Roadmap", "2026-09-01", "2026-12-31"),
    ("first_response", "First response time", "statistic", "Median 4 minutes in Q2 2026 internal benchmark; not a guarantee", 4, "minutes", "exact", "Benchmark Q2", "2026-07-15", "2026-12-31"),
    ("ceo", "CEO", "person", "Maya Rao, Chief Executive Officer", None, None, "exact", "Leadership Page", "2023-04-01", None),
    ("names", "Approved names", "name", "Product: NimbusDesk (one word). Routing feature: AutoRoute", None, None, "exact", "Naming Guide", "2024-01-01", None),
    ("integrations", "Integrations", "statistic", "120+ integrations", 120, "integrations", "at_least", "Integration Catalogue", "2026-09-01", "2027-02-28"),
    ("languages", "Supported languages", "statistic", "14 supported languages", 14, "languages", "exact", "Localisation Sheet", "2026-06-01", "2027-02-28"),
    ("free_trial", "Free trial", "pricing", "14 days, no credit card required", 14, "days", "exact", "Pricing Sheet", "2026-01-01", "2026-12-31"),
    ("award_top50", "Award claim", "award", "Top 50 SaaS Tool 2024", None, None, "exact", "Award Letter", "2024-12-01", "2025-12-31"),
    ("project_heron", "Embargoed project", "embargo", "Codename Project Heron = Pro Analytics v3; embargoed until 2026-12-01", None, None, "exact", "Launch Plan", "2026-09-15", "2026-12-01"),
]

# A drafted replacement for the customer count, used for the live blast-radius demo (approve it to trigger the change).
CUSTOMER_COUNT_V2 = ("65,000+ customers", 65000, "customers", "at_least", "Q3 Fact Sheet", "2026-10-15", "2027-01-31")

FACT_ALIASES = {
    "customer_count": [("customers", "surface_form"), ("customer base", "surface_form")],
    "names": [("Nimbus Desk", "banned_form"), ("NimbusDESK", "banned_form")],
}

EMBARGO_TERMS = [("Project Heron", "codename", "2026-12-01", "project_heron")]

# key, label, category, applies_to, severity, description, expected_behaviour, examples[(kind, text)]
RULES = [
    ("R-01", "Friendly and professional tone", "tone", ["all"], "medium", "Use a friendly and professional tone.", "Flag clearly rude or clearly stiff text", []),
    ("R-02", "Use contractions", "tone", ["web", "social", "email"], "low", "Use contractions to sound natural.", "Suggest contraction", [("good", "We're here to help."), ("bad", "We are here to help.")]),
    ("R-03", "Formal external tone", "tone", ["external"], "medium", "Maintain a formal tone in all external communications.", "Flag casual text", [("good", "We are pleased to announce our new office."), ("bad", "Hey folks, big news!")]),
    ("R-04", "Product name", "terminology", ["all"], "high", "The product name is NimbusDesk. Never write Nimbus Desk, NimbusDESK or Nimbus.", "Confirmed violation", [("good", "NimbusDesk helps teams resolve tickets."), ("bad", "Nimbus Desk helps teams resolve tickets.")]),
    ("R-05", "Customers and agents", "terminology", ["all"], "low", "Say customers for client organisations and agents for support staff. Do not say users.", "Suggest term", [("good", "Your agents can reply from any channel."), ("bad", "Your users can reply from any channel.")]),
    ("R-06", "No unsupported absolute claims", "claims", ["all"], "high", "Avoid absolute claims (guaranteed, 100%, never, always) unless an approved fact supports them.", "Flag and cite the supporting fact if one exists", [("good", "Median first response of 4 minutes in our Q2 2026 benchmark."), ("bad", "Guaranteed 1-minute replies.")]),
    ("R-07", "Statistics match approved facts", "claims", ["all"], "high", "Statistics must match approved facts and name the period.", "Confirmed violation when a statistic contradicts a fact", [("good", "65,000+ customers."), ("bad", "Over 50,000 customers.")]),
    ("R-08", "No unsupported superlatives", "claims", ["all"], "high", "Avoid superlatives (best, #1, leading) unless an approved, unexpired award supports them.", "Flag; cite the award fact if used", [("bad", "The #1 help desk.")]),
    ("R-09", "Short headlines", "other", ["web", "email"], "low", "Keep headlines short.", "Unclear threshold", []),
    ("R-10", "Alt text", "accessibility", ["web", "email"], "medium", "Every image needs alt text that describes its content; do not start with image of.", "Confirmed when missing", [("good", "Agent answering a chat on a laptop."), ("bad", "image of stuff")]),
    ("R-11", "Text contrast", "accessibility", ["visual"], "medium", "Body text contrast ratio must be at least 4.5:1.", "Confirmed by computation", [("bad", "Light grey text on a white background")]),
    ("R-12", "Embargo", "embargo", ["external"], "critical", "Do not mention embargoed names or codenames before the release date.", "Confirmed violation, human review required", [("bad", "Project Heron launches soon")]),
    ("R-13", "No competitor names", "claims", ["external"], "high", "Do not name competitors. Use only approved comparison wording.", "Flag any competitor name", []),
    ("R-14", "Plain language", "tone", ["all"], "low", "Use plain language and avoid jargon.", "Unclear threshold", []),
    ("R-15", "Emoji", "tone", ["social", "email"], "low", "Use emoji sparingly.", "Unclear threshold", []),
]

# code, title, channel, status, registered_state, scheduled_for, published_url, text
ASSETS = [
    ("A-01", "Trust banner draft", "web", "draft", "none", None, None, "Join 50,000+ customers who trust NimbusDesk"),
    ("A-02", "Trust banner in review", "web", "in_review", "none", None, None, "Join 65,000+ customers"),
    ("A-03", "Social post scheduled", "social", "approved", "scheduled", "2026-11-10T09:00:00+05:30", None, "Trusted by 50k+ support teams"),
    ("A-04", "Website hero", "web", "approved", "published", None, "https://nimbusdesk.example/", "Over 50,000 customers across 40 countries"),
    ("A-05", "Blog on ticket volume", "web", "approved", "published", None, "https://nimbusdesk.example/blog/tickets", "Our agents handle 50,000 tickets every day"),
    ("A-06", "PDF brochure", "pdf", "approved", "published", None, "https://nimbusdesk.example/brochure.pdf", "fifty thousand customers and counting"),
    ("A-07", "About page", "web", "approved", "published", None, "https://nimbusdesk.example/about", "We started in 2016 with just 50 customers"),
    ("A-08", "Pricing email scheduled", "email", "approved", "scheduled", "2026-11-12T09:00:00+05:30", None, "Starter plan from $19 per agent per month"),
    ("A-09", "Pricing page", "web", "approved", "published", None, "https://nimbusdesk.example/pricing", "Starter: $19 / Pro: $49 per agent per month"),
    ("A-10", "Award banner draft", "web", "draft", "none", None, None, "Named a Top 50 SaaS Tool 2024"),
    ("A-11", "Security PDF", "pdf", "approved", "published", None, "https://nimbusdesk.example/security.pdf", "SOC 2 Type II certified"),
    ("A-12", "Uptime copy draft", "web", "draft", "none", None, None, "99.9% uptime for Enterprise customers"),
]
