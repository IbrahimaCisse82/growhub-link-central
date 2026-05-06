-- ============== ALUMNI RECORDS ==============
CREATE TABLE IF NOT EXISTS public.alumni_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id uuid REFERENCES public.startups(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
  cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL,
  graduation_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','growing','paused','closed','acquired')),
  impact_summary text,
  contact_email text,
  contact_phone text,
  website_url text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alumni_records_program ON public.alumni_records(program_id);
CREATE INDEX IF NOT EXISTS idx_alumni_records_status ON public.alumni_records(status);

ALTER TABLE public.alumni_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alumni: read accessible programs"
ON public.alumni_records FOR SELECT TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR program_id IN (SELECT public.user_accessible_programs(auth.uid()))
  OR public.has_role(auth.uid(), 'funder')
);
CREATE POLICY "Alumni: write admin/coordinator/PM"
ON public.alumni_records FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin_or_coordinator(auth.uid())
  OR program_id IN (SELECT public.user_accessible_programs(auth.uid()))
);
CREATE POLICY "Alumni: update admin/coordinator/PM"
ON public.alumni_records FOR UPDATE TO authenticated
USING (
  public.is_admin_or_coordinator(auth.uid())
  OR program_id IN (SELECT public.user_accessible_programs(auth.uid()))
);
CREATE POLICY "Alumni: delete admin"
ON public.alumni_records FOR DELETE TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()));

CREATE TRIGGER trg_alumni_records_updated
BEFORE UPDATE ON public.alumni_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== ALUMNI KPIs ==============
CREATE TABLE IF NOT EXISTS public.alumni_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumni_id uuid NOT NULL REFERENCES public.alumni_records(id) ON DELETE CASCADE,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  revenue_xof numeric DEFAULT 0,
  jobs_total integer DEFAULT 0,
  jobs_women integer DEFAULT 0,
  jobs_youth integer DEFAULT 0,
  funding_raised_xof numeric DEFAULT 0,
  exports_xof numeric DEFAULT 0,
  customers_count integer DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alumni_kpis_alumni ON public.alumni_kpis(alumni_id, recorded_at DESC);

ALTER TABLE public.alumni_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alumni KPIs: read"
ON public.alumni_kpis FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.alumni_records ar
    WHERE ar.id = alumni_kpis.alumni_id
      AND (
        public.is_admin_or_coordinator(auth.uid())
        OR ar.program_id IN (SELECT public.user_accessible_programs(auth.uid()))
        OR public.has_role(auth.uid(), 'funder')
      )
  )
);
CREATE POLICY "Alumni KPIs: insert"
ON public.alumni_kpis FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.alumni_records ar
    WHERE ar.id = alumni_kpis.alumni_id
      AND (
        public.is_admin_or_coordinator(auth.uid())
        OR ar.program_id IN (SELECT public.user_accessible_programs(auth.uid()))
      )
  )
);
CREATE POLICY "Alumni KPIs: update"
ON public.alumni_kpis FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.alumni_records ar
    WHERE ar.id = alumni_kpis.alumni_id
      AND (
        public.is_admin_or_coordinator(auth.uid())
        OR ar.program_id IN (SELECT public.user_accessible_programs(auth.uid()))
      )
  )
);
CREATE POLICY "Alumni KPIs: delete"
ON public.alumni_kpis FOR DELETE TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()));

-- ============== Domain Events ==============
CREATE OR REPLACE FUNCTION public.tg_emit_alumni_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_domain_event(
      'alumni.created','alumni_record',NEW.id,
      jsonb_build_object('startup_id', NEW.startup_id, 'program_id', NEW.program_id, 'graduation_date', NEW.graduation_date)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_alumni_records_events ON public.alumni_records;
CREATE TRIGGER trg_alumni_records_events
AFTER INSERT ON public.alumni_records
FOR EACH ROW EXECUTE FUNCTION public.tg_emit_alumni_events();

CREATE OR REPLACE FUNCTION public.tg_emit_alumni_kpi_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.emit_domain_event(
    'alumni.kpi_recorded','alumni_kpi',NEW.id,
    jsonb_build_object('alumni_id', NEW.alumni_id, 'recorded_at', NEW.recorded_at,
      'revenue_xof', NEW.revenue_xof, 'jobs_total', NEW.jobs_total, 'funding_raised_xof', NEW.funding_raised_xof)
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_alumni_kpis_events ON public.alumni_kpis;
CREATE TRIGGER trg_alumni_kpis_events
AFTER INSERT ON public.alumni_kpis
FOR EACH ROW EXECUTE FUNCTION public.tg_emit_alumni_kpi_events();