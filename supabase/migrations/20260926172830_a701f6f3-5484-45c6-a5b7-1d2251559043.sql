DROP POLICY IF EXISTS "all authenticated read register" ON public.data_processing_register;
CREATE POLICY "staff read register" ON public.data_processing_register FOR SELECT TO authenticated
USING (public.is_admin_or_coordinator(auth.uid()) OR public.has_role(auth.uid(), 'staff'));