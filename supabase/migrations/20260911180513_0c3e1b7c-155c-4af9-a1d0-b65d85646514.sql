-- Helpers d'accès
CREATE OR REPLACE FUNCTION public.can_access_project(_user_id uuid, _project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _project_id IS NOT NULL AND (
    _project_id IN (SELECT public.user_accessible_projects(_user_id))
    OR EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.startup_members sm ON sm.startup_id = p.startup_id
      WHERE p.id = _project_id AND sm.user_id = _user_id
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_access_grant(_user_id uuid, _grant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _grant_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.grants g
    WHERE g.id = _grant_id
      AND (
        public.is_admin_or_coordinator(_user_id)
        OR public.can_access_project(_user_id, g.project_id)
        OR g.program_id IN (SELECT public.user_accessible_programs(_user_id))
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_project(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_grant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_project(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_grant(uuid, uuid) TO authenticated, service_role;

-- Projets / programmes / portefeuilles
DROP POLICY IF EXISTS "Projects viewable by authenticated" ON public.projects;
CREATE POLICY "Projects viewable by members" ON public.projects FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), id));

DROP POLICY IF EXISTS "Programs viewable by authenticated" ON public.programs;
CREATE POLICY "Programs viewable by members" ON public.programs FOR SELECT TO authenticated
USING (id IN (SELECT public.user_accessible_programs(auth.uid())));

DROP POLICY IF EXISTS "Portfolios viewable by authenticated" ON public.portfolios;
CREATE POLICY "Portfolios viewable by members" ON public.portfolios FOR SELECT TO authenticated
USING (id IN (SELECT public.user_accessible_portfolios(auth.uid())) OR owner_id = auth.uid());

-- Tables rattachées à un projet
DROP POLICY IF EXISTS "Cohorts viewable by authenticated" ON public.cohorts;
CREATE POLICY "Cohorts viewable by members" ON public.cohorts FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Logical frameworks viewable" ON public.logical_frameworks;
CREATE POLICY "Logical frameworks viewable by members" ON public.logical_frameworks FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Milestones viewable by authenticated" ON public.milestones;
CREATE POLICY "Milestones viewable by members" ON public.milestones FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Lecture partenaires" ON public.partner_outreach;
CREATE POLICY "Lecture partenaires membres" ON public.partner_outreach FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Lecture activités" ON public.project_activities;
CREATE POLICY "Lecture activités membres" ON public.project_activities FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Budget assumptions viewable by authenticated" ON public.project_budget_assumptions;
CREATE POLICY "Budget assumptions viewable by members" ON public.project_budget_assumptions FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Budget details viewable by authenticated" ON public.project_budget_details;
CREATE POLICY "Budget details viewable by members" ON public.project_budget_details FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project budget lines viewable" ON public.project_budget_lines;
CREATE POLICY "Project budget lines viewable by members" ON public.project_budget_lines FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Project indicators viewable" ON public.project_indicators;
CREATE POLICY "Project indicators viewable by members" ON public.project_indicators FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Lecture jalons plan" ON public.project_plan_milestones;
CREATE POLICY "Lecture jalons plan membres" ON public.project_plan_milestones FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Lecture plan tâches" ON public.project_plan_tasks;
CREATE POLICY "Lecture plan tâches membres" ON public.project_plan_tasks FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Risks viewable by authenticated" ON public.risks;
CREATE POLICY "Risks viewable by members" ON public.risks FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id) OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Tasks viewable by authenticated" ON public.tasks;
CREATE POLICY "Tasks viewable by members" ON public.tasks FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id) OR assignee_id = auth.uid());

DROP POLICY IF EXISTS "Theory of change viewable" ON public.theory_of_change;
CREATE POLICY "Theory of change viewable by members" ON public.theory_of_change FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id));

DROP POLICY IF EXISTS "Budgets viewable by authenticated" ON public.budgets;
CREATE POLICY "Budgets viewable by members" ON public.budgets FOR SELECT TO authenticated
USING (public.can_access_project(auth.uid(), project_id) OR public.can_access_grant(auth.uid(), grant_id));

DROP POLICY IF EXISTS "Authenticated read POs" ON public.purchase_orders;
CREATE POLICY "POs viewable by members" ON public.purchase_orders FOR SELECT TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()) OR created_by = auth.uid()
   OR public.can_access_project(auth.uid(), project_id) OR public.can_access_grant(auth.uid(), grant_id));

DROP POLICY IF EXISTS "Authenticated read PO lines" ON public.purchase_order_lines;
CREATE POLICY "PO lines viewable by members" ON public.purchase_order_lines FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id
  AND (public.is_admin_or_coordinator(auth.uid()) OR po.created_by = auth.uid()
       OR public.can_access_project(auth.uid(), po.project_id) OR public.can_access_grant(auth.uid(), po.grant_id))));

-- Tables rattachées à une subvention
DROP POLICY IF EXISTS "Grant activities viewable by authenticated" ON public.grant_activities;
CREATE POLICY "Grant activities viewable by members" ON public.grant_activities FOR SELECT TO authenticated
USING (public.can_access_grant(auth.uid(), grant_id));

DROP POLICY IF EXISTS "Grant addendums viewable by authenticated" ON public.grant_addendums;
CREATE POLICY "Grant addendums viewable by members" ON public.grant_addendums FOR SELECT TO authenticated
USING (public.can_access_grant(auth.uid(), grant_id));

DROP POLICY IF EXISTS "Addendum lines viewable by authenticated" ON public.grant_addendum_lines;
CREATE POLICY "Addendum lines viewable by members" ON public.grant_addendum_lines FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.grant_addendums a WHERE a.id = addendum_id AND public.can_access_grant(auth.uid(), a.grant_id)));

DROP POLICY IF EXISTS "Grant changes viewable by authenticated" ON public.grant_changes;
CREATE POLICY "Grant changes viewable by members" ON public.grant_changes FOR SELECT TO authenticated
USING (public.can_access_grant(auth.uid(), grant_id));

DROP POLICY IF EXISTS "Grant disbursements viewable by authenticated" ON public.grant_disbursements;
CREATE POLICY "Grant disbursements viewable by members" ON public.grant_disbursements FOR SELECT TO authenticated
USING (public.can_access_grant(auth.uid(), grant_id));

DROP POLICY IF EXISTS "Grant documents viewable by authenticated" ON public.grant_documents;
CREATE POLICY "Grant documents viewable by members" ON public.grant_documents FOR SELECT TO authenticated
USING (public.can_access_grant(auth.uid(), grant_id));

DROP POLICY IF EXISTS "Grant indicators viewable by authenticated" ON public.grant_indicators;
CREATE POLICY "Grant indicators viewable by members" ON public.grant_indicators FOR SELECT TO authenticated
USING (public.can_access_grant(auth.uid(), grant_id));

DROP POLICY IF EXISTS "Grant reports viewable by authenticated" ON public.grant_reports;
CREATE POLICY "Grant reports viewable by members" ON public.grant_reports FOR SELECT TO authenticated
USING (public.can_access_grant(auth.uid(), grant_id));

DROP POLICY IF EXISTS "Grant transactions viewable by authenticated" ON public.grant_transactions;
CREATE POLICY "Grant transactions viewable by members" ON public.grant_transactions FOR SELECT TO authenticated
USING (public.can_access_grant(auth.uid(), grant_id));

-- Programme / entreprise
DROP POLICY IF EXISTS "Surveys viewable by authenticated" ON public.surveys;
CREATE POLICY "Surveys viewable by members" ON public.surveys FOR SELECT TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()) OR created_by = auth.uid()
   OR program_id IS NULL OR program_id IN (SELECT public.user_accessible_programs(auth.uid())));

DROP POLICY IF EXISTS "Authenticated can read forms" ON public.data_collection_forms;
CREATE POLICY "Forms viewable by members" ON public.data_collection_forms FOR SELECT TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()) OR created_by = auth.uid()
   OR program_id IS NULL OR program_id IN (SELECT public.user_accessible_programs(auth.uid())));

DROP POLICY IF EXISTS "KPIs viewable by authenticated" ON public.startup_kpis;
CREATE POLICY "KPIs viewable by members" ON public.startup_kpis FOR SELECT TO authenticated
USING (public.is_admin_or_coordinator(auth.uid())
   OR EXISTS (SELECT 1 FROM public.startup_members sm WHERE sm.startup_id = startup_kpis.startup_id AND sm.user_id = auth.uid()));

-- Confidentiel : administration uniquement
DROP POLICY IF EXISTS "HR payroll history viewable by authenticated" ON public.hr_payroll_history;
CREATE POLICY "HR payroll history admin only" ON public.hr_payroll_history FOR SELECT TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read reminders" ON public.invoice_reminders;
CREATE POLICY "Invoice reminders admin only" ON public.invoice_reminders FOR SELECT TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()) OR sent_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated can read coaching tasks" ON public.coaching_tasks;
CREATE POLICY "Coaching tasks viewable by parties" ON public.coaching_tasks FOR SELECT TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()) OR assignee_id = auth.uid() OR created_by = auth.uid());

-- Commentaires et documents polymorphes
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.entity_comments;
CREATE POLICY "Comments viewable by members" ON public.entity_comments FOR SELECT TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()) OR author_id = auth.uid()
   OR (entity_type = 'project' AND public.can_access_project(auth.uid(), entity_id))
   OR (entity_type = 'grant' AND public.can_access_grant(auth.uid(), entity_id)));

DROP POLICY IF EXISTS "Entity documents viewable by authenticated" ON public.entity_documents;
CREATE POLICY "Entity documents viewable by members" ON public.entity_documents FOR SELECT TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()) OR uploaded_by = auth.uid()
   OR (entity_type = 'project' AND public.can_access_project(auth.uid(), entity_id))
   OR (entity_type = 'grant' AND public.can_access_grant(auth.uid(), entity_id)));