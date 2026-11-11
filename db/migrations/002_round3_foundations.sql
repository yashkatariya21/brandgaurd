-- Additive Round 3 foundations. Graph references are tenant-scoped even for
-- privileged writers; RLS also constrains all reads and writes by the app role.
ALTER TABLE fact_versions ADD COLUMN embedding vector(1536);
ALTER TABLE content_claims ADD COLUMN embedding vector(1536);
CREATE INDEX fact_versions_embedding_hnsw ON fact_versions USING hnsw (embedding vector_cosine_ops);
CREATE INDEX content_claims_embedding_hnsw ON content_claims USING hnsw (embedding vector_cosine_ops);

ALTER TABLE fact_versions ADD COLUMN rejection_reason text;
ALTER TABLE rule_versions ADD COLUMN rejection_reason text;

CREATE TABLE graph_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  node_type text NOT NULL CHECK (node_type IN ('fact','claim','content','channel')),
  ref_id text NOT NULL,
  label text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (org_id, node_type, ref_id),
  UNIQUE (org_id, id)
);
CREATE TABLE graph_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organisations(id),
  src_id uuid NOT NULL,
  dst_id uuid NOT NULL,
  edge_type text NOT NULL CHECK (edge_type IN ('asserts','extracted_from','published_on','supports')),
  match_method text NOT NULL CHECK (match_method IN ('exact','attribute','embedding','local-similarity','link')),
  score numeric CHECK (score IS NULL OR (score >= 0 AND score <= 1)),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  FOREIGN KEY (org_id, src_id) REFERENCES graph_nodes(org_id, id) ON DELETE CASCADE,
  FOREIGN KEY (org_id, dst_id) REFERENCES graph_nodes(org_id, id) ON DELETE CASCADE,
  UNIQUE (org_id, src_id, dst_id, edge_type, match_method)
);
CREATE INDEX graph_edges_org_dst ON graph_edges (org_id, dst_id);
ALTER TABLE graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_nodes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON graph_nodes
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON graph_edges
  USING (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.org_id', true), '')::uuid);
