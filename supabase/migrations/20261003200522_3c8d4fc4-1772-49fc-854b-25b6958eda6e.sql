DROP POLICY IF EXISTS "Grants viewable by authenticated" ON public.grants;
DROP POLICY IF EXISTS "Grants viewable by members" ON public.grants;
CREATE POLICY "Grants viewable by members"
ON public.grants FOR SELECT TO authenticated
USING (public.can_access_grant(auth.uid(), id));

DROP POLICY IF EXISTS "Grant disbursements viewable by members" ON public.grant_disbursements;
DROP POLICY IF EXISTS "grant_disbursements_select" ON public.grant_disbursements;
CREATE POLICY "Grant disbursements viewable by members"
ON public.grant_disbursements FOR SELECT TO authenticated
USING (
  public.can_access_grant(auth.uid(), grant_id)
  AND NOT public.is_restricted_project_viewer(auth.uid(), (SELECT g.project_id FROM public.grants g WHERE g.id = grant_id))
);

DROP POLICY IF EXISTS "Grant documents viewable by members" ON public.grant_documents;
DROP POLICY IF EXISTS "grant_documents_select" ON public.grant_documents;
CREATE POLICY "Grant documents viewable by members"
ON public.grant_documents FOR SELECT TO authenticated
USING (
  public.can_access_grant(auth.uid(), grant_id)
  AND NOT public.is_restricted_project_viewer(auth.uid(), (SELECT g.project_id FROM public.grants g WHERE g.id = grant_id))
);

DROP POLICY IF EXISTS "Grant transactions viewable by members" ON public.grant_transactions;
DROP POLICY IF EXISTS "grant_transactions_select" ON public.grant_transactions;
CREATE POLICY "Grant transactions viewable by members"
ON public.grant_transactions FOR SELECT TO authenticated
USING (
  public.can_access_grant(auth.uid(), grant_id)
  AND NOT public.is_restricted_project_viewer(auth.uid(), (SELECT g.project_id FROM public.grants g WHERE g.id = grant_id))
);

DROP POLICY IF EXISTS "Grant reports viewable by members" ON public.grant_reports;
DROP POLICY IF EXISTS "grant_reports_select" ON public.grant_reports;
CREATE POLICY "Grant reports viewable by members"
ON public.grant_reports FOR SELECT TO authenticated
USING (
  public.can_access_grant(auth.uid(), grant_id)
  AND NOT public.is_restricted_project_viewer(auth.uid(), (SELECT g.project_id FROM public.grants g WHERE g.id = grant_id))
);

DROP POLICY IF EXISTS "Grant indicators viewable by members" ON public.grant_indicators;
DROP POLICY IF EXISTS "grant_indicators_select" ON public.grant_indicators;
CREATE POLICY "Grant indicators viewable by members"
ON public.grant_indicators FOR SELECT TO authenticated
USING (
  public.can_access_grant(auth.uid(), grant_id)
  AND NOT public.is_restricted_project_viewer(auth.uid(), (SELECT g.project_id FROM public.grants g WHERE g.id = grant_id))
);

DROP POLICY IF EXISTS "Entity documents select" ON public.entity_documents;
DROP POLICY IF EXISTS "entity_documents_select" ON public.entity_documents;
CREATE POLICY "Entity documents select"
ON public.entity_documents FOR SELECT TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR uploaded_by = auth.uid()
  OR (
    entity_type = 'project'
    AND public.can_access_project(auth.uid(), entity_id)
    AND NOT public.is_restricted_project_viewer(auth.uid(), entity_id)
  )
  OR (
    entity_type = 'grant'
    AND public.can_access_grant(auth.uid(), entity_id)
    AND NOT public.is_restricted_project_viewer(auth.uid(), (SELECT g.project_id FROM public.grants g WHERE g.id = entity_id))
  )
);

REVOKE EXECUTE ON FUNCTION public.acc_asset_dotation(public.accounting_fixed_assets, date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acc_asset_dotation(public.accounting_fixed_assets, date, date) TO service_role;