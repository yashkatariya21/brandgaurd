-- Optional vector provenance. Existing unlabelled vectors remain untouched and
-- are ignored by graph retrieval. Writers must record the exact input and model
-- identifier together with the vector; no external provider is called here.
ALTER TABLE fact_versions ADD COLUMN embedding_model text;
ALTER TABLE fact_versions ADD COLUMN embedding_input text;
ALTER TABLE content_claims ADD COLUMN embedding_model text;
ALTER TABLE content_claims ADD COLUMN embedding_input text;
