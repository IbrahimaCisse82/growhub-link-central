CREATE TABLE public.donor_report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid NOT NULL REFERENCES public.grants(id) ON DELETE CASCADE,
  template text NOT NULL,
  period_label text NOT NULL CHECK (char_length(period_label) BETWEEN 1 AND 120),
  start_date date,
  end_date date,
  narrative jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','validated','rejected')),
  review_comment text,
  created_by uuid DEFAULT auth.uid(),
  submitted_at timestamptz,
  validated_by uuid,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donor_report_versions TO authenticated;
GRANT ALL ON public.donor_report_versions TO service_role;
ALTER TABLE public.donor_report_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read donor report versions" ON public.donor_report_versions FOR SELECT TO authenticated
  USING (public.can_access_grant(auth.uid(), grant_id));
CREATE POLICY "create donor report versions" ON public.donor_report_versions FOR INSERT TO authenticated
  WITH CHECK (public.can_access_grant(auth.uid(), grant_id) AND created_by = auth.uid());
CREATE POLICY "update donor report versions" ON public.donor_report_versions FOR UPDATE TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid()) OR (created_by = auth.uid() AND status IN ('draft','rejected')))
  WITH CHECK (public.can_access_grant(auth.uid(), grant_id));
CREATE POLICY "delete donor report drafts" ON public.donor_report_versions FOR DELETE TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid()) OR (created_by = auth.uid() AND status = 'draft'));

CREATE OR REPLACE FUNCTION public.tg_donor_report_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version FROM public.donor_report_versions
      WHERE grant_id = NEW.grant_id AND period_label = NEW.period_label AND template = NEW.template;
    NEW.status := 'draft';
    RETURN NEW;
  END IF;
  IF NEW.status IN ('validated','rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.is_admin_or_coordinator(auth.uid()) THEN RAISE EXCEPTION 'Seuls administrateurs et coordinateurs valident'; END IF;
    NEW.validated_by := auth.uid(); NEW.validated_at := now();
  END IF;
  IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted' THEN NEW.submitted_at := now(); END IF;
  IF OLD.status = 'validated' AND NEW.narrative IS DISTINCT FROM OLD.narrative THEN
    RAISE EXCEPTION 'Version validée : créez une nouvelle version';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.tg_donor_report_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_donor_report_guard BEFORE INSERT OR UPDATE ON public.donor_report_versions
  FOR EACH ROW EXECUTE FUNCTION public.tg_donor_report_guard();
CREATE INDEX idx_donor_report_versions_grant ON public.donor_report_versions(grant_id, created_at DESC);