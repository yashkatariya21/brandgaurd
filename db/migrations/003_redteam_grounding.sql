-- Round 3: legacy persona findings have no validated citation and remain hidden
-- from the default evidence-grounded view until rerun.
ALTER TABLE findings ADD COLUMN grounded boolean NOT NULL DEFAULT false;
ALTER TABLE findings ADD COLUMN citations jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE findings ADD COLUMN stability_appearances int;
ALTER TABLE findings ADD COLUMN stability_total int;
ALTER TABLE findings ADD COLUMN stable boolean NOT NULL DEFAULT false;
ALTER TABLE findings ADD CONSTRAINT findings_stability_bounds CHECK (
  (stability_appearances IS NULL AND stability_total IS NULL) OR
  (stability_total BETWEEN 1 AND 5 AND stability_appearances BETWEEN 1 AND stability_total)
);
ALTER TABLE analysis_runs ADD CONSTRAINT analysis_runs_org_id_id_unique UNIQUE (org_id, id);
CREATE TABLE redteam_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  analysis_run_id uuid NOT NULL,
  persona text NOT NULL,
  reason text NOT NULL,
  raw_finding jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (org_id, analysis_run_id) REFERENCES analysis_runs(org_id, id)
);
ALTER TABLE redteam_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE redteam_drops FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON redteam_drops
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
CREATE INDEX redteam_drops_run ON redteam_drops(org_id, analysis_run_id);
CREATE INDEX redteam_cache ON analysis_runs(org_id, (config->>'cache_key')) WHERE kind='redteam' AND status='done';
