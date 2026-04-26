
-- Table de tracking pour notifications RH (éviter doublons)
CREATE TABLE IF NOT EXISTS public.hr_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  reminder_type text NOT NULL, -- 'contract_expiry' | 'trial_end' | 'birthday' | 'work_anniversary'
  reference_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE (employee_id, reminder_type, reference_date)
);

CREATE INDEX IF NOT EXISTS idx_hr_reminder_log_employee ON public.hr_reminder_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_reminder_log_type_date ON public.hr_reminder_log(reminder_type, reference_date);

ALTER TABLE public.hr_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR managers view reminder log"
  ON public.hr_reminder_log FOR SELECT TO authenticated
  USING (public.is_admin_or_coordinator(auth.uid()));

CREATE POLICY "Service role manages reminder log"
  ON public.hr_reminder_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);
