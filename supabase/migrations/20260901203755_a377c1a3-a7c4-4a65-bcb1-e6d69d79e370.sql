CREATE TABLE public.project_plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_ref text,
  wbs text,
  level int NOT NULL DEFAULT 2,
  title text NOT NULL,
  description text,
  deliverable text,
  duration_days int,
  start_date date,
  end_date date,
  predecessors text,
  owner text,
  is_milestone boolean NOT NULL DEFAULT false,
  priority text,
  status text NOT NULL DEFAULT 'Non démarré',
  progress int NOT NULL DEFAULT 0,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.project_plan_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_plan_tasks TO authenticated;
GRANT ALL ON public.project_plan_tasks TO service_role;
ALTER TABLE public.project_plan_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture plan tâches" ON public.project_plan_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion plan tâches admin" ON public.project_plan_tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_scoped_role(auth.uid(), 'project_manager', 'project', project_id)) WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_scoped_role(auth.uid(), 'project_manager', 'project', project_id));

CREATE TABLE public.project_plan_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_ref text,
  title text NOT NULL,
  target_date date,
  lot text,
  owner text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_plan_milestones TO authenticated;
GRANT ALL ON public.project_plan_milestones TO service_role;
ALTER TABLE public.project_plan_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture jalons plan" ON public.project_plan_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion jalons plan admin" ON public.project_plan_milestones FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_scoped_role(auth.uid(), 'project_manager', 'project', project_id)) WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_scoped_role(auth.uid(), 'project_manager', 'project', project_id));

CREATE TABLE public.project_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  code text,
  title text NOT NULL,
  work_package text,
  objective text,
  start_period text,
  end_period text,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_activities TO authenticated;
GRANT ALL ON public.project_activities TO service_role;
ALTER TABLE public.project_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture activités" ON public.project_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion activités admin" ON public.project_activities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_scoped_role(auth.uid(), 'project_manager', 'project', project_id)) WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_scoped_role(auth.uid(), 'project_manager', 'project', project_id));

CREATE TABLE public.partner_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  num int,
  institution text NOT NULL,
  category text,
  partnership_type text,
  documents text,
  sent_date date,
  channel text,
  contact_person text,
  contact_info text,
  letter_ref text,
  status text,
  followup_date date,
  response_date date,
  next_step text,
  priority text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_outreach TO authenticated;
GRANT ALL ON public.partner_outreach TO service_role;
ALTER TABLE public.partner_outreach ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lecture partenaires" ON public.partner_outreach FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gestion partenaires admin" ON public.partner_outreach FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_scoped_role(auth.uid(), 'project_manager', 'project', project_id)) WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'coordinator') OR public.has_scoped_role(auth.uid(), 'project_manager', 'project', project_id));

CREATE TRIGGER trg_plan_tasks_updated BEFORE UPDATE ON public.project_plan_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plan_milestones_updated BEFORE UPDATE ON public.project_plan_milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_activities_updated BEFORE UPDATE ON public.project_activities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_partner_outreach_updated BEFORE UPDATE ON public.partner_outreach FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();