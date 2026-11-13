-- Narrow, audited deletion without granting direct DELETE on immutable versions.
-- Only a tenant admin or brand manager may remove an unused, unregistered draft.
CREATE FUNCTION public.delete_unused_content_draft(p_item_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  tenant_id uuid := NULLIF(current_setting('app.org_id', true), '')::uuid;
  actor_id uuid := NULLIF(current_setting('app.user_id', true), '')::uuid;
  item public.content_items%ROWTYPE;
  version_count integer;
BEGIN
  IF tenant_id IS NULL OR actor_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.memberships m WHERE m.org_id=tenant_id AND m.user_id=actor_id
        AND m.role IN ('admin', 'brand_manager')) THEN
    RETURN 'forbidden';
  END IF;
  -- Serialise with graph rebuilds, then lock the item as in other mutations.
  PERFORM pg_advisory_xact_lock(hashtextextended(tenant_id::text, 0));
  SELECT * INTO item FROM public.content_items WHERE id=p_item_id AND org_id=tenant_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF item.status <> 'draft' OR item.registered_state <> 'none'
      OR item.scheduled_for IS NOT NULL OR item.published_url IS NOT NULL THEN RETURN 'protected'; END IF;
  SELECT count(*) INTO version_count FROM public.content_versions WHERE content_item_id=p_item_id AND org_id=tenant_id;
  -- Existing version history is not disposable, even if the current item is a draft.
  IF version_count <> 1 OR item.current_version_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.content_versions WHERE id=item.current_version_id AND content_item_id=p_item_id AND org_id=tenant_id
    ) THEN RETURN 'protected'; END IF;
  IF EXISTS (SELECT 1 FROM public.content_claims WHERE content_version_id=item.current_version_id AND org_id=tenant_id)
    OR EXISTS (SELECT 1 FROM public.analysis_runs WHERE content_version_id=item.current_version_id AND org_id=tenant_id)
    OR EXISTS (SELECT 1 FROM public.findings WHERE content_version_id=item.current_version_id AND org_id=tenant_id)
    OR EXISTS (SELECT 1 FROM public.comments WHERE content_item_id=p_item_id AND org_id=tenant_id)
    OR EXISTS (SELECT 1 FROM public.approvals WHERE content_version_id=item.current_version_id AND org_id=tenant_id)
    OR EXISTS (SELECT 1 FROM public.passports WHERE content_version_id=item.current_version_id AND org_id=tenant_id)
  THEN RETURN 'protected'; END IF;
  UPDATE public.content_items SET current_version_id=NULL WHERE id=p_item_id AND org_id=tenant_id;
  DELETE FROM public.content_versions WHERE id=item.current_version_id AND org_id=tenant_id;
  DELETE FROM public.content_items WHERE id=p_item_id AND org_id=tenant_id;
  DELETE FROM public.graph_nodes WHERE org_id=tenant_id AND
    ((node_type='content' AND ref_id=p_item_id::text) OR (node_type='claim' AND meta->>'content_id'=p_item_id::text));
  INSERT INTO public.audit_log (org_id,actor_id,action,object_type,object_id,after)
    VALUES (tenant_id,actor_id,'content.draft_deleted','content_item',p_item_id,jsonb_build_object('version_id',item.current_version_id));
  RETURN 'deleted';
END $$;

CREATE FUNCTION public.delete_unused_fact_draft(p_fact_id uuid, p_version_no integer) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  tenant_id uuid := NULLIF(current_setting('app.org_id', true), '')::uuid;
  actor_id uuid := NULLIF(current_setting('app.user_id', true), '')::uuid;
  current_id uuid;
  version_id uuid;
  version_status text;
BEGIN
  IF tenant_id IS NULL OR actor_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.memberships m WHERE m.org_id=tenant_id AND m.user_id=actor_id
        AND m.role IN ('admin', 'brand_manager')) THEN RETURN 'forbidden'; END IF;
  SELECT current_version_id INTO current_id FROM public.facts
    WHERE id=p_fact_id AND org_id=tenant_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  SELECT id,status INTO version_id,version_status FROM public.fact_versions
    WHERE fact_id=p_fact_id AND version_no=p_version_no AND org_id=tenant_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF version_status <> 'draft' OR current_id IS NOT DISTINCT FROM version_id THEN RETURN 'protected'; END IF;
  DELETE FROM public.fact_versions WHERE id=version_id AND org_id=tenant_id;
  INSERT INTO public.audit_log (org_id,actor_id,action,object_type,object_id,after)
    VALUES (tenant_id,actor_id,'fact.draft_deleted','fact_version',version_id,jsonb_build_object('fact_id',p_fact_id,'version_no',p_version_no));
  RETURN 'deleted';
END $$;

REVOKE ALL ON FUNCTION public.delete_unused_content_draft(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_unused_fact_draft(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_unused_content_draft(uuid) TO brandguard_app;
GRANT EXECUTE ON FUNCTION public.delete_unused_fact_draft(uuid, integer) TO brandguard_app;
