CREATE TABLE public.deleted_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  label text,
  data jsonb NOT NULL,
  deleted_by uuid,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz
);
GRANT SELECT, DELETE ON public.deleted_records TO authenticated;
GRANT ALL ON public.deleted_records TO service_role;
ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read trash" ON public.deleted_records FOR SELECT TO authenticated USING (public.is_admin_or_coordinator(auth.uid()));
CREATE POLICY "super admin purge trash" ON public.deleted_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE INDEX idx_deleted_records_at ON public.deleted_records(deleted_at DESC);

CREATE OR REPLACE FUNCTION public.tg_capture_deleted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE j jsonb := to_jsonb(OLD);
BEGIN
  INSERT INTO public.deleted_records(table_name, record_id, label, data, deleted_by)
  VALUES (TG_TABLE_NAME, (j->>'id')::uuid, COALESCE(j->>'name', j->>'title', j->>'label', j->>'code'), j, auth.uid());
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.tg_capture_deleted() FROM PUBLIC, anon, authenticated;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['portfolios','programs','projects','cohorts','startups','milestones','tasks','risks','resources','partners','surveys','mentor_profiles','alumni_records','grants','events','budgets','me_measurements'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_capture_deleted ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_capture_deleted AFTER DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_capture_deleted()', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.restore_deleted_record(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.deleted_records;
BEGIN
  IF NOT public.is_admin_or_coordinator(auth.uid()) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  SELECT * INTO r FROM public.deleted_records WHERE id = _id AND restored_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Élément introuvable ou déjà restauré'; END IF;
  IF r.table_name NOT IN ('portfolios','programs','projects','cohorts','startups','milestones','tasks','risks','resources','partners','surveys','mentor_profiles','alumni_records','grants','events','budgets','me_measurements') THEN
    RAISE EXCEPTION 'Table non autorisée';
  END IF;
  EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I, $1)', r.table_name, r.table_name) USING r.data;
  UPDATE public.deleted_records SET restored_at = now() WHERE id = _id;
END $$;
REVOKE ALL ON FUNCTION public.restore_deleted_record(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_deleted_record(uuid) TO authenticated;