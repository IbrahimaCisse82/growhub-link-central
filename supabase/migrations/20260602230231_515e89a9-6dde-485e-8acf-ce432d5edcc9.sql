CREATE TABLE public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_type text NOT NULL CHECK (import_type IN ('startups','employees','budgets','crm')),
  file_name text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  success_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  mapping jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','partial','failed')),
  imported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.import_logs TO authenticated;
GRANT ALL ON public.import_logs TO service_role;

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/coord/PM can view import logs"
ON public.import_logs FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'coordinator')
  OR public.has_role(auth.uid(), 'project_manager')
);

CREATE POLICY "Admins/coord/PM can insert import logs"
ON public.import_logs FOR INSERT TO authenticated
WITH CHECK (
  imported_by = auth.uid() AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'project_manager')
  )
);

CREATE INDEX idx_import_logs_created_at ON public.import_logs(created_at DESC);
CREATE INDEX idx_import_logs_type ON public.import_logs(import_type);

CREATE OR REPLACE FUNCTION public.emit_import_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.domain_events (event_type, entity_type, entity_id, actor_id, payload)
  VALUES (
    'import.completed',
    'import_log',
    NEW.id,
    NEW.imported_by,
    jsonb_build_object(
      'import_type', NEW.import_type,
      'file_name', NEW.file_name,
      'total_rows', NEW.total_rows,
      'success_rows', NEW.success_rows,
      'error_rows', NEW.error_rows,
      'status', NEW.status
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_import_completed
AFTER INSERT ON public.import_logs
FOR EACH ROW EXECUTE FUNCTION public.emit_import_completed();