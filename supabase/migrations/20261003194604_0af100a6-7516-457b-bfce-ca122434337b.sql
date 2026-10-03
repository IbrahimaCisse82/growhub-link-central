CREATE TABLE public.accounting_annex_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_code text NOT NULL,
  item_type text NOT NULL DEFAULT 'information',
  label text NOT NULL,
  description text,
  amount numeric,
  start_date date,
  end_date date,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounting_annex_data_document_code_check CHECK (document_code IN ('R1','R2','R3','R4','Note 1','Note 2','Note 8A','Note 15B','Note 16B','Note 16B bis','Note 16C','Note 27B','Note 31','Note 34','Note 35'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_annex_data TO authenticated;
GRANT ALL ON public.accounting_annex_data TO service_role;

ALTER TABLE public.accounting_annex_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accounting annexes viewable by accounting users"
ON public.accounting_annex_data FOR SELECT TO authenticated
USING (public.can_view_accounting(auth.uid()));

CREATE POLICY "Accounting annexes managed by admins"
ON public.accounting_annex_data FOR ALL TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()))
WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE INDEX accounting_annex_data_document_idx
ON public.accounting_annex_data(document_code, sort_order, created_at);

CREATE TRIGGER accounting_annex_data_updated_at
BEFORE UPDATE ON public.accounting_annex_data
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_restricted_project_viewer(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    NOT public.is_admin_or_coordinator(_user_id)
    AND NOT public.has_role(_user_id, 'staff')
    AND NOT public.has_scoped_role(_user_id, 'project_manager', 'project', _project_id)
    AND (
      public.has_scoped_role(_user_id, 'mentor', 'project', _project_id)
      OR public.has_scoped_role(_user_id, 'funder', 'project', _project_id)
    )
$$;

REVOKE ALL ON FUNCTION public.is_restricted_project_viewer(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_restricted_project_viewer(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Risks viewable by members" ON public.risks;
CREATE POLICY "Risks viewable by members"
ON public.risks FOR SELECT TO authenticated
USING (
  public.can_access_project(auth.uid(), project_id)
  AND NOT public.is_restricted_project_viewer(auth.uid(), project_id)
);

DROP POLICY IF EXISTS "Lecture partenaires membres" ON public.partner_outreach;
CREATE POLICY "Lecture partenaires membres"
ON public.partner_outreach FOR SELECT TO authenticated
USING (
  public.can_access_project(auth.uid(), project_id)
  AND NOT public.is_restricted_project_viewer(auth.uid(), project_id)
);

DROP POLICY IF EXISTS "Budget lines viewable by members" ON public.project_budget_lines;
CREATE POLICY "Budget lines viewable by members"
ON public.project_budget_lines FOR SELECT TO authenticated
USING (
  public.can_access_project(auth.uid(), project_id)
  AND NOT public.is_restricted_project_viewer(auth.uid(), project_id)
);

DROP POLICY IF EXISTS "Budget details viewable by members" ON public.project_budget_details;
CREATE POLICY "Budget details viewable by members"
ON public.project_budget_details FOR SELECT TO authenticated
USING (
  public.can_access_project(auth.uid(), project_id)
  AND NOT public.is_restricted_project_viewer(auth.uid(), project_id)
);

DROP POLICY IF EXISTS "Budgets viewable by members" ON public.budgets;
CREATE POLICY "Budgets viewable by members"
ON public.budgets FOR SELECT TO authenticated
USING (
  (public.can_access_project(auth.uid(), project_id) OR public.can_access_grant(auth.uid(), grant_id))
  AND NOT public.has_scoped_role(auth.uid(), 'mentor', 'project', project_id)
);

DROP POLICY IF EXISTS dataroom_checklist_select ON public.dataroom_checklist;
CREATE POLICY dataroom_checklist_select
ON public.dataroom_checklist FOR SELECT TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR (
    project_id IN (SELECT public.user_accessible_projects(auth.uid()))
    AND NOT public.is_restricted_project_viewer(auth.uid(), project_id)
  )
);

DROP POLICY IF EXISTS dataroom_checklist_write ON public.dataroom_checklist;
CREATE POLICY dataroom_checklist_write
ON public.dataroom_checklist FOR ALL TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR (
    project_id IN (SELECT public.user_accessible_projects(auth.uid()))
    AND NOT public.is_restricted_project_viewer(auth.uid(), project_id)
  )
)
WITH CHECK (
  public.is_admin_or_coordinator(auth.uid())
  OR (
    project_id IN (SELECT public.user_accessible_projects(auth.uid()))
    AND NOT public.is_restricted_project_viewer(auth.uid(), project_id)
  )
);

DROP POLICY IF EXISTS dataroom_folders_select ON public.dataroom_folders;
CREATE POLICY dataroom_folders_select
ON public.dataroom_folders FOR SELECT TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR (
    project_id IN (SELECT public.user_accessible_projects(auth.uid()))
    AND NOT public.is_restricted_project_viewer(auth.uid(), project_id)
  )
);

DROP POLICY IF EXISTS dataroom_folders_write ON public.dataroom_folders;
CREATE POLICY dataroom_folders_write
ON public.dataroom_folders FOR ALL TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR (
    project_id IN (SELECT public.user_accessible_projects(auth.uid()))
    AND NOT public.is_restricted_project_viewer(auth.uid(), project_id)
  )
)
WITH CHECK (
  public.is_admin_or_coordinator(auth.uid())
  OR (
    project_id IN (SELECT public.user_accessible_projects(auth.uid()))
    AND NOT public.is_restricted_project_viewer(auth.uid(), project_id)
  )
);

DROP POLICY IF EXISTS "Entity documents viewable by members" ON public.entity_documents;
CREATE POLICY "Entity documents viewable by members"
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
    AND NOT public.has_scoped_role(auth.uid(), 'funder', 'grant', entity_id)
  )
);