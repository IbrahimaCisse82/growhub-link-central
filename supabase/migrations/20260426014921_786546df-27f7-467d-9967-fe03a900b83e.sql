
DROP POLICY IF EXISTS "Service role manages reminder log" ON public.hr_reminder_log;

CREATE POLICY "Service role inserts reminder log"
  ON public.hr_reminder_log FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role reads reminder log"
  ON public.hr_reminder_log FOR SELECT TO service_role
  USING (true);
