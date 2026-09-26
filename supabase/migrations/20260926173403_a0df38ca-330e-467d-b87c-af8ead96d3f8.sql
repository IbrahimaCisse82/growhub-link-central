CREATE TABLE public.treasury_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 200),
  direction text NOT NULL CHECK (direction IN ('in','out')),
  amount_xof numeric NOT NULL CHECK (amount_xof >= 0),
  expected_on date NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treasury_forecasts TO authenticated;
GRANT ALL ON public.treasury_forecasts TO service_role;
ALTER TABLE public.treasury_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance read forecasts" ON public.treasury_forecasts FOR SELECT TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid()) OR public.has_role(auth.uid(),'staff'));
CREATE POLICY "finance write forecasts" ON public.treasury_forecasts FOR ALL TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid())) WITH CHECK (public.is_admin_or_coordinator(auth.uid()));
CREATE TRIGGER trg_treasury_forecasts_updated BEFORE UPDATE ON public.treasury_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_treasury_forecasts_date ON public.treasury_forecasts(expected_on);