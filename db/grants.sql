-- Re-applied by the migration runner on every run (idempotent).
GRANT USAGE ON SCHEMA public TO brandguard_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO brandguard_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO brandguard_app;
-- Append-only and immutable records
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM brandguard_app;
REVOKE UPDATE, DELETE, TRUNCATE ON content_versions, passports FROM brandguard_app;
REVOKE DELETE, TRUNCATE ON fact_versions, rule_versions FROM brandguard_app;
REVOKE ALL ON schema_migrations FROM brandguard_app;
