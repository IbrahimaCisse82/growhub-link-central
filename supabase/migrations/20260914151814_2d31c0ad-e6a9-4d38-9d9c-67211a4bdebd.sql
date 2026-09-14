DROP POLICY IF EXISTS "Matches viewable by involved" ON public.mentor_matches;
CREATE POLICY "Matches viewable by involved" ON public.mentor_matches FOR SELECT TO authenticated
USING (
  auth.uid() = mentor_id
  OR is_admin_or_coordinator(auth.uid())
  OR public.is_startup_founder(auth.uid(), startup_id)
);