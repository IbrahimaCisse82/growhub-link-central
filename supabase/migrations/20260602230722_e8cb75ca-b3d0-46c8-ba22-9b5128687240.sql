-- 1) Fix emit_import_completed (utilise les bons noms de colonnes via emit_domain_event)
CREATE OR REPLACE FUNCTION public.emit_import_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.emit_domain_event(
    'import.completed',
    'import_log',
    NEW.id,
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

-- 2) Quiz settings sur course_modules
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS passing_score integer NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS time_limit_minutes integer,
  ADD COLUMN IF NOT EXISTS shuffle_questions boolean NOT NULL DEFAULT false;

-- 3) Table quiz_attempts
CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  percentage numeric(5,2) NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own attempts"
ON public.quiz_attempts FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'coordinator')
);

CREATE POLICY "Users create their own attempts"
ON public.quiz_attempts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_quiz_attempts_module ON public.quiz_attempts(module_id);
CREATE INDEX idx_quiz_attempts_user ON public.quiz_attempts(user_id);

-- 4) Table mentor_blacklists
CREATE TABLE public.mentor_blacklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  startup_id uuid NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, startup_id)
);

GRANT SELECT, INSERT, DELETE ON public.mentor_blacklists TO authenticated;
GRANT ALL ON public.mentor_blacklists TO service_role;

ALTER TABLE public.mentor_blacklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/coord/PM read blacklist"
ON public.mentor_blacklists FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'coordinator')
  OR public.has_role(auth.uid(), 'project_manager')
);

CREATE POLICY "Admin/coord/PM manage blacklist"
ON public.mentor_blacklists FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'coordinator')
    OR public.has_role(auth.uid(), 'project_manager')
  )
);

CREATE POLICY "Admin/coord delete blacklist"
ON public.mentor_blacklists FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'coordinator')
);

-- 5) rejection_reason sur mentor_matches
ALTER TABLE public.mentor_matches
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;