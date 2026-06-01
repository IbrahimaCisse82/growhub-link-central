-- Bloc 3 — Analytique impact ODD
CREATE TABLE public.impact_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  sdg_number INT NOT NULL CHECK (sdg_number BETWEEN 1 AND 17),
  indicator_name TEXT NOT NULL,
  unit TEXT,
  target_value NUMERIC,
  actual_value NUMERIC DEFAULT 0,
  period_start DATE,
  period_end DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.impact_indicators TO authenticated;
GRANT ALL ON public.impact_indicators TO service_role;

ALTER TABLE public.impact_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/coord full access impact_indicators"
ON public.impact_indicators FOR ALL TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()))
WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Scoped read impact_indicators"
ON public.impact_indicators FOR SELECT TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR (program_id IS NOT NULL AND program_id IN (SELECT public.user_accessible_programs(auth.uid())))
  OR (project_id IS NOT NULL AND project_id IN (SELECT public.user_accessible_projects(auth.uid())))
);

CREATE POLICY "Scoped write impact_indicators"
ON public.impact_indicators FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_coordinator(auth.uid())
  OR (project_id IS NOT NULL AND project_id IN (SELECT public.user_accessible_projects(auth.uid())))
);

CREATE POLICY "Scoped update impact_indicators"
ON public.impact_indicators FOR UPDATE TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR (project_id IS NOT NULL AND project_id IN (SELECT public.user_accessible_projects(auth.uid())))
);

CREATE TRIGGER impact_indicators_updated_at
BEFORE UPDATE ON public.impact_indicators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_impact_indicators_program ON public.impact_indicators(program_id);
CREATE INDEX idx_impact_indicators_project ON public.impact_indicators(project_id);
CREATE INDEX idx_impact_indicators_sdg ON public.impact_indicators(sdg_number);