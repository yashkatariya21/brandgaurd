-- BrandGuard initial schema (Build Blueprint, Section 2). Every tenant table carries org_id and row-level security.
CREATE EXTENSION IF NOT EXISTS vector;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'brandguard_app') THEN
    CREATE ROLE brandguard_app NOLOGIN;
  END IF;
END $$;

CREATE TABLE organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  ai_disclosure_ack boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower ON users (lower(email));

CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('admin','brand_manager','approver','manager','creator','external_creator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id)
);

CREATE TABLE facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  key text NOT NULL,
  label text NOT NULL,
  category text NOT NULL CHECK (category IN ('statistic','pricing','certification','name','person','award','embargo','location','other')),
  owner_user_id uuid REFERENCES users(id),
  current_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id),
  UNIQUE (org_id, key)
);

CREATE TABLE fact_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  fact_id uuid NOT NULL REFERENCES facts(id),
  version_no int NOT NULL,
  value_text text NOT NULL,
  value_number numeric,
  value_unit text,
  qualifier text NOT NULL DEFAULT 'exact' CHECK (qualifier IN ('exact','at_least','approx')),
  source_ref text,
  evidence_chunk_id uuid,
  valid_from date NOT NULL,
  expires_at date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','superseded','rejected')),
  change_note text,
  proposed_by uuid NOT NULL REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  content_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fact_id, version_no),
  CONSTRAINT separation_of_duties CHECK (approved_by IS NULL OR approved_by <> proposed_by)
);
ALTER TABLE facts ADD CONSTRAINT facts_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES fact_versions(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE fact_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  fact_id uuid NOT NULL REFERENCES facts(id),
  alias_text text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('surface_form','banned_form'))
);

CREATE TABLE rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  key text NOT NULL,
  label text NOT NULL,
  category text NOT NULL CHECK (category IN ('tone','terminology','claims','accessibility','embargo','visual','other')),
  applies_to jsonb NOT NULL DEFAULT '[]'::jsonb,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  current_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id),
  UNIQUE (org_id, key)
);

CREATE TABLE rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  rule_id uuid NOT NULL REFERENCES rules(id),
  version_no int NOT NULL,
  description text NOT NULL,
  expected_behaviour text,
  validation_criteria text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','superseded','rejected')),
  change_note text,
  proposed_by uuid NOT NULL REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_id, version_no),
  CONSTRAINT rule_separation_of_duties CHECK (approved_by IS NULL OR approved_by <> proposed_by)
);
ALTER TABLE rules ADD CONSTRAINT rules_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES rule_versions(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE rule_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  rule_version_id uuid NOT NULL REFERENCES rule_versions(id),
  kind text NOT NULL CHECK (kind IN ('good','bad','borderline')),
  text text NOT NULL,
  human_label text CHECK (human_label IN ('pass','fail','borderline')),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','generated')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('guideline','factsheet','asset_spec')),
  storage_key text NOT NULL,
  version_label text,
  confidential boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

CREATE TABLE chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  document_id uuid NOT NULL REFERENCES documents(id),
  ordinal int NOT NULL,
  text text NOT NULL,
  page int,
  heading text,
  embedding vector(1536),   -- adjust before first use if the chosen embedding model has another dimension
  valid_from date,
  valid_to date
);

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('logo','image','palette')),
  storage_key text,
  alt_text_required boolean NOT NULL DEFAULT true,
  usage_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  title text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('web','social','email','press','pdf','image')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','analysing','findings_ready','in_revision','in_review','changes_requested','approved','rejected','held_for_reverification')),
  registered_state text NOT NULL DEFAULT 'none' CHECK (registered_state IN ('none','scheduled','published')),
  scheduled_for timestamptz,
  published_url text,
  current_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

CREATE TABLE content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  content_item_id uuid NOT NULL REFERENCES content_items(id),
  version_no int NOT NULL,
  body_text text NOT NULL,
  source_file_key text,
  extracted_blocks jsonb,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id),
  UNIQUE (content_item_id, version_no)
);
ALTER TABLE content_items ADD CONSTRAINT content_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES content_versions(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE content_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  content_version_id uuid NOT NULL REFERENCES content_versions(id),
  span_start int NOT NULL,
  span_end int NOT NULL,
  raw_text text NOT NULL,
  entity text,
  attribute text,
  value_number numeric,
  value_unit text,
  qualifier text,
  fact_id uuid REFERENCES facts(id),
  fact_version_no int,
  link_status text NOT NULL DEFAULT 'unlinked' CHECK (link_status IN ('auto','suggested','confirmed','unlinked')),
  link_score numeric
);
CREATE INDEX content_claims_fact ON content_claims (fact_id, fact_version_no);

CREATE TABLE analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  content_version_id uuid REFERENCES content_versions(id),
  kind text NOT NULL CHECK (kind IN ('review','redteam','reverify','impact','ingest')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  started_at timestamptz,
  finished_at timestamptz,
  model_id text,
  prompt_version text,
  config jsonb,
  cost_estimate numeric,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

CREATE TABLE findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  analysis_run_id uuid NOT NULL REFERENCES analysis_runs(id),
  content_version_id uuid NOT NULL REFERENCES content_versions(id),
  span_start int,
  span_end int,
  finding_type text NOT NULL CHECK (finding_type IN ('confirmed','possible')),
  source_kind text NOT NULL CHECK (source_kind IN ('deterministic','retrieval','persona')),
  persona text,
  rule_id uuid REFERENCES rules(id),
  fact_id uuid REFERENCES facts(id),
  evidence_chunk_ids uuid[],
  issue text NOT NULL,
  why_it_matters text,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  confidence text NOT NULL CHECK (confidence IN ('low','medium','high')),
  human_review_required boolean NOT NULL DEFAULT false,
  suggested_text text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','edited','dismissed','escalated')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE debates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  finding_id uuid NOT NULL UNIQUE REFERENCES findings(id),
  prosecutor_text text NOT NULL,
  defender_text text NOT NULL,
  minimal_edit text,
  model_id text,
  prompt_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  finding_id uuid NOT NULL REFERENCES findings(id),
  decided_by uuid NOT NULL REFERENCES users(id),
  action text NOT NULL CHECK (action IN ('accept','edit','dismiss','escalate')),
  reason_code text CHECK (reason_code IN ('not_applicable','intended_meaning','rule_unclear','evidence_wrong','other')),
  reason_text text,
  final_text text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dismiss_needs_reason CHECK (action <> 'dismiss' OR reason_code IS NOT NULL)
);

CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  content_item_id uuid NOT NULL REFERENCES content_items(id),
  content_version_id uuid REFERENCES content_versions(id),
  author_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  parent_id uuid REFERENCES comments(id),
  finding_id uuid REFERENCES findings(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  content_version_id uuid NOT NULL REFERENCES content_versions(id),
  stage text NOT NULL CHECK (stage IN ('manager_review','final_approval')),
  requested_by uuid REFERENCES users(id),
  decided_by uuid REFERENCES users(id),
  decision text CHECK (decision IN ('approved','changes_requested','rejected')),
  note text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE passports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  content_version_id uuid NOT NULL UNIQUE REFERENCES content_versions(id),
  manifest jsonb NOT NULL,
  manifest_hash text NOT NULL,
  signature text NOT NULL,
  signing_key_id text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chaos_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  rule_version_ids uuid[] NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  started_at timestamptz,
  finished_at timestamptz,
  model_id text,
  prompt_version text,
  n_interpreters int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

CREATE TABLE chaos_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  chaos_run_id uuid NOT NULL REFERENCES chaos_runs(id),
  rule_version_id uuid NOT NULL REFERENCES rule_versions(id),
  text text NOT NULL,
  axis text,
  intended_label text NOT NULL CHECK (intended_label IN ('pass','fail','borderline')),
  human_label text CHECK (human_label IN ('pass','fail','borderline'))
);

CREATE TABLE chaos_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  chaos_case_id uuid NOT NULL UNIQUE REFERENCES chaos_cases(id),
  verdicts jsonb NOT NULL,
  agreement numeric NOT NULL,
  majority_verdict text NOT NULL
);

CREATE TABLE chaos_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  chaos_run_id uuid NOT NULL REFERENCES chaos_runs(id),
  kind text NOT NULL CHECK (kind IN ('ambiguity','contradiction','overlap','missing_example','gap')),
  rule_version_ids uuid[],
  description text NOT NULL,
  suggested_clarification text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','rejected'))
);

CREATE TABLE embargo_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  term text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('codename','product','price')),
  embargo_until date NOT NULL,
  fact_id uuid REFERENCES facts(id)
);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  object_type text NOT NULL,
  object_id uuid,
  before jsonb,
  after jsonb,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_org_at ON audit_log (org_id, at DESC);

-- Version content is immutable once a version leaves draft.
CREATE OR REPLACE FUNCTION guard_fact_version() RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'draft' AND (
       NEW.value_text IS DISTINCT FROM OLD.value_text OR NEW.value_number IS DISTINCT FROM OLD.value_number
    OR NEW.value_unit IS DISTINCT FROM OLD.value_unit OR NEW.qualifier IS DISTINCT FROM OLD.qualifier
    OR NEW.valid_from IS DISTINCT FROM OLD.valid_from OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR NEW.source_ref IS DISTINCT FROM OLD.source_ref OR NEW.version_no <> OLD.version_no OR NEW.fact_id <> OLD.fact_id) THEN
    RAISE EXCEPTION 'fact version content is immutable after it leaves draft' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER fact_versions_guard BEFORE UPDATE ON fact_versions FOR EACH ROW EXECUTE FUNCTION guard_fact_version();

CREATE OR REPLACE FUNCTION guard_rule_version() RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'draft' AND (
       NEW.description IS DISTINCT FROM OLD.description OR NEW.expected_behaviour IS DISTINCT FROM OLD.expected_behaviour
    OR NEW.validation_criteria IS DISTINCT FROM OLD.validation_criteria OR NEW.version_no <> OLD.version_no OR NEW.rule_id <> OLD.rule_id) THEN
    RAISE EXCEPTION 'rule version content is immutable after it leaves draft' USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER rule_versions_guard BEFORE UPDATE ON rule_versions FOR EACH ROW EXECUTE FUNCTION guard_rule_version();

-- Row-level security: every table with org_id is visible only inside its own tenant context.
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns
           WHERE table_schema = 'public' AND column_name = 'org_id' AND table_name <> 'memberships' LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (org_id = NULLIF(current_setting(''app.org_id'', true), '''')::uuid) WITH CHECK (org_id = NULLIF(current_setting(''app.org_id'', true), '''')::uuid)', t);
  END LOOP;
END $$;

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_access ON memberships
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid
         OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
