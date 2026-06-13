
-- Enum phases
DO $$ BEGIN
  CREATE TYPE public.me_phase AS ENUM ('baseline','midline','endline','adhoc');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- me_measurements
-- =========================
CREATE TABLE IF NOT EXISTS public.me_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_indicator_id uuid REFERENCES public.project_indicators(id) ON DELETE CASCADE,
  grant_indicator_id uuid REFERENCES public.grant_indicators(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  grant_id uuid REFERENCES public.grants(id) ON DELETE CASCADE,
  phase public.me_phase NOT NULL DEFAULT 'adhoc',
  measured_value numeric NOT NULL,
  measured_at date NOT NULL DEFAULT CURRENT_DATE,
  sample_size integer,
  methodology text,
  evidence_doc_url text,
  validated_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT me_measurements_indicator_chk CHECK (
    (project_indicator_id IS NOT NULL) OR (grant_indicator_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_me_measurements_pi ON public.me_measurements(project_indicator_id);
CREATE INDEX IF NOT EXISTS idx_me_measurements_gi ON public.me_measurements(grant_indicator_id);
CREATE INDEX IF NOT EXISTS idx_me_measurements_project ON public.me_measurements(project_id);
CREATE INDEX IF NOT EXISTS idx_me_measurements_grant ON public.me_measurements(grant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.me_measurements TO authenticated;
GRANT ALL ON public.me_measurements TO service_role;

ALTER TABLE public.me_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "me_measurements_select" ON public.me_measurements FOR SELECT TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR (project_id IS NOT NULL AND project_id IN (SELECT public.user_accessible_projects(auth.uid())))
  OR (grant_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.grants g WHERE g.id = me_measurements.grant_id AND (g.project_id IS NULL OR g.project_id IN (SELECT public.user_accessible_projects(auth.uid())))))
);

CREATE POLICY "me_measurements_modify_admin" ON public.me_measurements FOR ALL TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()))
WITH CHECK (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "me_measurements_modify_owner" ON public.me_measurements FOR ALL TO authenticated
USING (
  created_by = auth.uid()
  OR (project_id IS NOT NULL AND project_id IN (SELECT public.user_accessible_projects(auth.uid())))
)
WITH CHECK (
  created_by = auth.uid()
  OR (project_id IS NOT NULL AND project_id IN (SELECT public.user_accessible_projects(auth.uid())))
);

CREATE TRIGGER trg_me_measurements_updated_at BEFORE UPDATE ON public.me_measurements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- me_monitoring_plans (PMP)
-- =========================
CREATE TABLE IF NOT EXISTS public.me_monitoring_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  grant_id uuid REFERENCES public.grants(id) ON DELETE CASCADE,
  project_indicator_id uuid REFERENCES public.project_indicators(id) ON DELETE CASCADE,
  grant_indicator_id uuid REFERENCES public.grant_indicators(id) ON DELETE CASCADE,
  data_source text NOT NULL,
  collection_method text,
  collection_frequency text NOT NULL DEFAULT 'trimestriel',
  responsible_user_id uuid REFERENCES auth.users(id),
  target_phases jsonb NOT NULL DEFAULT '["baseline","endline"]'::jsonb,
  disaggregation jsonb,
  quality_assurance text,
  next_measurement_due date,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_me_pmp_project ON public.me_monitoring_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_me_pmp_grant ON public.me_monitoring_plans(grant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.me_monitoring_plans TO authenticated;
GRANT ALL ON public.me_monitoring_plans TO service_role;

ALTER TABLE public.me_monitoring_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "me_pmp_select" ON public.me_monitoring_plans FOR SELECT TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR (project_id IS NOT NULL AND project_id IN (SELECT public.user_accessible_projects(auth.uid())))
  OR responsible_user_id = auth.uid()
);

CREATE POLICY "me_pmp_modify" ON public.me_monitoring_plans FOR ALL TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR (project_id IS NOT NULL AND project_id IN (SELECT public.user_accessible_projects(auth.uid())))
)
WITH CHECK (
  public.is_admin_or_coordinator(auth.uid())
  OR (project_id IS NOT NULL AND project_id IN (SELECT public.user_accessible_projects(auth.uid())))
);

CREATE TRIGGER trg_me_pmp_updated_at BEFORE UPDATE ON public.me_monitoring_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- View: me_indicator_progress
-- =========================
CREATE OR REPLACE VIEW public.me_indicator_progress
WITH (security_invoker = on) AS
WITH proj AS (
  SELECT
    pi.id AS indicator_id,
    'project'::text AS source,
    pi.project_id,
    NULL::uuid AS grant_id,
    pi.name,
    pi.unit,
    pi.baseline_value,
    pi.target_value,
    pi.current_value
  FROM public.project_indicators pi
),
gr AS (
  SELECT
    gi.id AS indicator_id,
    'grant'::text AS source,
    NULL::uuid AS project_id,
    gi.grant_id,
    gi.name,
    gi.unit,
    gi.baseline_value,
    gi.target_value,
    gi.current_value
  FROM public.grant_indicators gi
),
all_ind AS (SELECT * FROM proj UNION ALL SELECT * FROM gr),
meas AS (
  SELECT
    COALESCE(project_indicator_id, grant_indicator_id) AS indicator_id,
    MAX(measured_value) FILTER (WHERE phase = 'baseline') AS baseline_measured,
    MAX(measured_value) FILTER (WHERE phase = 'midline') AS midline_measured,
    MAX(measured_value) FILTER (WHERE phase = 'endline') AS endline_measured,
    MAX(measured_at) FILTER (WHERE phase = 'endline') AS endline_date,
    COUNT(*) AS measurement_count
  FROM public.me_measurements
  GROUP BY 1
)
SELECT
  a.indicator_id,
  a.source,
  a.project_id,
  a.grant_id,
  a.name,
  a.unit,
  a.baseline_value,
  a.target_value,
  a.current_value,
  m.baseline_measured,
  m.midline_measured,
  m.endline_measured,
  m.endline_date,
  COALESCE(m.measurement_count, 0) AS measurement_count,
  CASE
    WHEN a.target_value IS NULL OR a.target_value = 0 THEN NULL
    WHEN m.endline_measured IS NOT NULL THEN ROUND((m.endline_measured / a.target_value) * 100, 2)
    WHEN a.current_value IS NOT NULL THEN ROUND((a.current_value / a.target_value) * 100, 2)
    ELSE NULL
  END AS achievement_pct,
  CASE
    WHEN COALESCE(a.baseline_value, m.baseline_measured) IS NULL THEN NULL
    WHEN COALESCE(a.baseline_value, m.baseline_measured) = 0 THEN NULL
    WHEN m.endline_measured IS NOT NULL THEN
      ROUND(((m.endline_measured - COALESCE(a.baseline_value, m.baseline_measured)) / COALESCE(a.baseline_value, m.baseline_measured)) * 100, 2)
    ELSE NULL
  END AS variation_vs_baseline_pct
FROM all_ind a
LEFT JOIN meas m ON m.indicator_id = a.indicator_id;

GRANT SELECT ON public.me_indicator_progress TO authenticated;
